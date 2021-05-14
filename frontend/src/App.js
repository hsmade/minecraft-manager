import React, {Component} from 'react';
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            servers: [],
            enabledServers: 0,
            searchQuery: "",
        };

        this.setSearchQuery = this.setSearchQuery.bind(this);

    }

    async updateData() {
        const res = await fetch(window.location.protocol + '//' + window.location.host + '/v1/servers');
        let data = await res.json();
        let enabledServers = 0
        if (data.length > 0) {
            enabledServers = (Object.values(data.map(server => server.status.online?1:0)).reduce(function(a,b){return a+b}))
            data = data.sort((a, b) => (a.port > b.port)?1:-1)
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

    setSearchQuery(event) {
        this.setState({searchQuery: event.target.value.toLowerCase()});
    }

    render() {
        let serverList = this.state.servers

        if (this.state.searchQuery !== "") {
            serverList = serverList.filter(server => {
                return server.motd.toLowerCase().includes(this.state.searchQuery)
            })
        }

        let servers = serverList.map(server => <ServerInfo server={server} enabledServers={this.state.enabledServers}/>)

        return (
            <div>
                Zoeken: <input type={"text"} name={"search"} onChange={this.setSearchQuery}/>
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
            wantedState: null, // does user want this server to be running?
        };
        this.setServerState = this.setServerState.bind(this);
    }

    setServerState() {
        // console.log("Setting", this.props.server.motd, "to", !this.props.server.status.online)
        this.setState({wantedState: !this.props.server.status.online}) // register users' wanted state for this server
        let options = {}
        if (this.props.server.status.online) {
            options = {method: "DELETE"}
        } else {
            options = {method: "PUT"}
        }
        // do the call to the backend to set the server state
        fetch(window.location.protocol + '//' + window.location.host + '/v1/servers/'+this.props.server.id, options).then(data => console.log("done", data))
    }

    render() {
        // console.log(this.props)
        const className = this.props.server.status.online?"online":"offline"
        let buttonText = this.props.server.status.online?"zet uit":"zet aan" // disable:enable
        if (this.state.wantedState != null && this.state.wantedState !== this.props.server.status.online) {
            buttonText = this.state.wantedState?"starten...":"stoppen..." // starting:stopping
        }
        return(
            <tbody className={className}>
                <tr>
                    <td rowSpan={3}>
                        <img alt="server" width={64} height={64} src={this.props.server.status.favicon}/>
                    </td>
                    <td>{this.props.server.path}</td>
                    <td align={"right"}>poort: <b>{this.props.server.port}</b></td>
                    <td rowSpan={3} align={"right"}>
                        {/*disable the button if we have more than 1 server running, to save resources*/}
                        <button disabled={this.props.enabledServers > 1 && !this.props.server.status.online} onClick={this.setServerState}>{buttonText}</button>
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
