var os = require("os")
var http = require("http")
var url = require("url")


/** Starts a server and exposes the current process status through an HTTP API.
 * If it's a node master, it will gather slaves statuses. If it's a slave, it will report to the master
 *
 * @param options {
 *     express: {
 *         app: <app instance>,
 *         route: "<http route to get the status of the app>"
 *     },
 *     selfDeclare: {
 *         url: "<url to the root url of the corporal app gathering all statuses>"
 *     }
 * }
 * @constructor
 */
function Soldier(options) {

    if(options.express) {

        options.express.app.get(options.express.route, function(req, res) {
            res.send(getCurrentStatus())
        })

    }

    if(options.selfDeclare && options.selfDeclare.url) {

        var endpoint = url.parse(options.selfDeclare.url)

        var selfDeclareRequestOptions = {
            hostname: endpoint.hostname,
            port: endpoint.port,
            path: endpoint.path,
            auth: endpoint.auth,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            "method": "POST"
        }

        var selfDeclareRequest = http.request(selfDeclareRequestOptions, function(res) {

            if(res.statusCode === 200) {

                console.log("The Soldier successfully registered to Corporal at ["+options.selfDeclare.url+"]")

            } else {

                console.log("The Soldier failed to register to Corporal at ["+options.selfDeclare.url+"]")
                console.log("HTTP return code ["+res.statusCode+"]. The Http response body is coming:")

                res.on('data', function (chunk) {

                    console.log(chunk)

                })
            }
        })


        selfDeclareRequest.on('error', function(e) {
            console.log("There was an error during the attempt to self declare to Corporal at ["+options.selfDeclare.url+"].")
            console.log(e)
        })

        var listeningPort

        if(options.express) {
            if(options.express.port) {
                listeningPort = options.express.port
            } else if (options.express.app.address()) {
                listeningPort = options.express.app.address().port
            }
        }

        var declaredStatus = {
            addresses: getPublicNetworkAddresses(),
            port: listeningPort
        }

        selfDeclareRequest.write(JSON.stringify(declaredStatus))
        selfDeclareRequest.end()
    }

}

function getPublicNetworkAddresses() {

    var addresses = []

    var network = os.networkInterfaces()

    for(var interface in network) {
        for(var i = 0 ; i < network[interface].length ; i++) {
            var address = network[interface][i]
            if(!address.internal) {

                addresses.push(address)

            }
        }
    }
}

function getCurrentStatus() {
    var status = {
        os: {
            hostname: os.hostname(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            memory: {
                total: os.totalmem(),
                free: os.freemem()
            },
            network: getPublicNetworkInfo()
        },
        process: {
            uptime: process.uptime(),
            memory: process.memoryUsage()
        }

    }

}

module.exports.Soldier