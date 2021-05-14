# Minecraft manager
A quick and dirty app to manage multiple minecraft servers.
My kid wants lots of servers, and I don't want all of them to keep them running all the time.
Now she can manage them herself.
The backend will probe each server that it found, for the version, players and icon. If it can't find the version or
icon, it will try to find the in the `level.dat` file in the main world. Due to this, and the fact that there's no caching
implemented, opening the web page takes a few seconds. It will refresh the data every 5 seconds to update the page.
The app will not allow more than 2 servers to run at the same time, to save resources.

## Build
    make build

## Run
    MINECRAFT_ROOT=/some/where make run
    
The software expects that `MINECRAFT_ROOT` contains directories with minecraft servers in them. The directories should
match the name `.minecraft*`.
You can set `SERVER_IP` to override the IP for the server that runs the minecraft servers (defaults to localhost).
