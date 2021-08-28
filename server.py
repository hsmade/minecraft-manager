import glob
from configparser import ConfigParser
import os
from psutil import process_iter
from signal import SIGTERM
import logging
from flask import Flask, jsonify, send_from_directory, redirect
from mcstatus import MinecraftServer
import base64
from nbt import nbt
from subprocess import Popen

logging.basicConfig(level="INFO")
app = Flask(__name__)


@app.route('/')
def index():
    return redirect("/static/index.html")


@app.route('/static/<path>')
def static_files(path):
    return send_from_directory('static', path)


@app.route('/v1/servers', methods=["GET"])
@app.route('/v1/servers/', methods=["GET"])
def list_servers():
    servers = Servers(app.config["PATH"]).list()
    return jsonify([server.to_json() for server in servers])


@app.route('/v1/servers/<server_id>', methods=["GET"])
def get_server(server_id):
    server = Servers(app.config["PATH"]).get(server_id)
    if server:
        return jsonify(server.to_json())
    else:
        return "", 404


@app.route('/v1/servers/<server_id>', methods=["PUT"])
def start_server(server_id):
    server = Servers(app.config["PATH"]).get(server_id)
    if server:
        return jsonify(server.start())
    else:
        return "", 404


@app.route('/v1/servers/<server_id>', methods=["DELETE"])
def stop_server(server_id):
    server = Servers(app.config["PATH"]).get(server_id)
    if server:
        return jsonify(server.stop())
    else:
        return None, 404


class Server:
    def __init__(self, path, properties):
        self.path = path
        self.properties = properties
        self.motd = self.properties['motd']
        self.id = base64.b64encode(self.motd.encode("utf-8")).decode("utf-8")
        self.port = int(self.properties['server-port'])

    @property
    def status(self):
        logging.debug("getting status for server %s on port %d", self.motd, self.port)
        result = {
            "num_players": 0,
            "sample": [],
            "version": None,
            "favicon": None,
            "online": False,
        }
        try:
            server = MinecraftServer.lookup(os.environ.get("SERVER_IP", "localhost") + ":" + str(self.port))
            status = server.status()
            players = None
            if status.players.sample is not None:
                players = [player.name for player in status.players.sample]
            result = {
                "num_players": status.players.online,
                "sample": players,
                "version": status.version.name,
                "favicon": status.favicon,
                "online": True,
            }
        except ConnectionRefusedError as e:
            logging.debug("server connection failed: %s", e)
        except Exception as e:
            logging.debug("server status exception: %s", e)
            result["online"] = True

        if not result['favicon']:
            icon_file = os.path.join(os.path.dirname(self.path), self.properties["level-name"], "icon.png")
            logging.debug("image path:%s", icon_file)
            if os.path.exists(icon_file):
                image = open(icon_file, 'rb').read()
                result['favicon'] = "data:image/png;base64," + base64.b64encode(image).decode("utf-8")
            else:
                result['favicon'] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",  # transparent pixel

        if not result["version"]:
            level_file = os.path.join(os.path.dirname(self.path), self.properties["level-name"], "level.dat")
            if os.path.exists(level_file):
                nbtfile = nbt.NBTFile(level_file)
                result['version'] = str(nbtfile.get("Data", {}).get("Version", {}).get("Name", "?.?.?"))

        return result

    def start(self):
        p = Popen([
            "/usr/bin/screen",
            "-d", "-m", "-S",
            self.motd,
            "./server.sh",
            "&"
        ], cwd=os.path.dirname(self.path))
        logging.info("Started server %s on port %d: %s", self.motd, self.port, p.returncode)
        return p.returncode

    def stop(self):
        for proc in process_iter():
            try:
                for conns in proc.connections(kind='inet'):
                    if conns.laddr.port == self.port:
                        logging.warning("Shutting down %s on port %d with pid %d and name %s",
                                        self.motd, self.port, proc.pid, proc.name())
                        proc.send_signal(SIGTERM)
                        return True
            except Exception as e:
                logging.debug(e)
        return False

    def to_json(self):
        return {
            "id": self.id,
            "path": self.path,
            "motd": self.motd,
            "port": self.port,
            "status": self.status,
        }


class Servers:
    def __init__(self, path):
        self.path = path

    def list(self):
        files = glob.glob(self.path + '/.minecraft*/server.properties', recursive=True)
        return [self.create_server(file) for file in files]

    def get(self, server_id):
        servers = self.list()
        for server in servers:
            if server.id == server_id:
                return server
        return None

    def create_server(self, filename):
        logging.debug("reading %s", filename)
        with open(filename, 'r') as f:
            config_string = '[dummy_section]\n' + f.read()
        config = ConfigParser()
        config.read_string(config_string)
        return Server(path=filename, properties=config['dummy_section'])


if __name__ == '__main__':
    app.config["PATH"] = os.environ.get("MINECRAFT_ROOT", os.getcwd())
    app.run(host="0.0.0.0", debug=True)
