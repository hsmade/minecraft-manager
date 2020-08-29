import React, {Component} from 'react';
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            servers: [],
            enabledServers: 0,
            search: "",
        };

        this.handleSearch = this.handleSearch.bind(this);

    }

    async updateData() {
        const res = await fetch('/v1/servers');
        const data = await res.json();
        let enabledServers = 0
        if (data.length > 0) {
            enabledServers = (Object.values(data.map(server => server.status.online?1:0)).reduce(function(a,b){return a+b}))
        }
        this.setState({servers: data, enabledServers: enabledServers})
        // console.log(this.state)
    }

    componentDidMount() {
        try {
            this.updateData();
            setInterval(async () => { await this.updateData() }, 5000);
        } catch(e) {
            console.log(e);
        }
    }

    handleSearch(event) {
        this.setState({search: event.target.value});
    }

    render() {
    let servers = this.state.servers.map(server => <ServerInfo server={server} enabledServers={this.state.enabledServers}/>)
    if (this.state.search !== "") {
        servers = Object.values(servers).filter(server => {
            return server.props.server.motd.includes(this.state.search)
        }
    )
    }
    return (
        <div>
            Zoeken: <input type={"text"} name={"search"} onChange={this.handleSearch}/>
            <table>
                {servers}
            </table>
        </div>
    );
  }
}

class ServerInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            wantedState: null,
        };
        this.setServerState = this.setServerState.bind(this);
    }

    setServerState() {
        console.log("Setting", this.props.server.motd, "to", !this.props.server.status.online)
        this.setState({wantedState: !this.props.server.status.online})
        if (this.props.server.status.online) {
            fetch('/v1/servers/'+this.props.server.id, {method: "DELETE"}).then(data => console.log("done", data))
        } else {
            fetch('/v1/servers/'+this.props.server.id, {method: "PUT"}).then(data => console.log("done", data))
        }
    }

    render() {
        // console.log(this.props)
        const className = this.props.server.status.online?"online":"offline"
        let buttonText = this.props.server.status.online?"zet uit":"zet aan"
        if (this.state.wantedState != null && this.state.wantedState !== this.props.server.status.online) {
            buttonText = this.state.wantedState?"starten...":"stoppen..."
        }
        return(
            <tbody className={className}>
                <tr>
                    <td rowSpan={3}>
                        <img width={64} height={64} src={this.props.server.status.favicon}/>
                    </td>
                    <td>{this.props.server.path}</td>
                    <td align={"right"}>poort: <b>{this.props.server.port}</b></td>
                    <td rowSpan={3} align={"right"}>
                        <button disabled={this.props.enabledServers>1 && !this.props.server.status.online} onClick={this.setServerState}>{buttonText}</button>
                    </td>
                </tr>
                <tr>
                    <td><b>{this.props.server.motd}</b></td>
                </tr>
                <tr>
                    <td>spelers: {this.props.server.status.num_players} {this.props.server.status.sample?Object.values(this.props.server.status.sample).join(" "):""}</td>
                    <td align={"right"}>versie: {this.props.server.status.version}</td>
                </tr>
            </tbody>
        )
    }
}

export default App;
