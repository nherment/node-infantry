var http = require("http")
var logger = require("./util/Logger.js")

function handleHttpDeclaration(req, res) {
    handleNewSoldier(req.body)
    res.send({})
}

function handleNewSoldier(soldierInfo) {

}

var State = {
    RUNNING: "running",
    DOWN: "down"
}

var soldiers = []

/** Retrieve soldier's status.
 *
 * The first time, it will try all declared network addresses of the soldier until a working one is found.
 * On subsequent calls, the latest successful network address will be tried in priority. If it fails, this function will
 * retry all other addresses until a working one is found. If it fails, the callback will return nothing (err=undefined, status=undefined)
 *
 * @param soldierInfo
 * @param callback(err, status)
 *
 */
function updateSoldierStatus(soldierInfo, callback) {

    if(soldierInfo) {

        if(soldierInfo.lastSuccessfulAddress) {
            getStatus(soldierInfo.lastSuccessfulAddress.address, soldierInfo.port, function(err, result) {

                if(err) {

                    logger.error(err)
                    soldierInterfacesChainCheck(soldierInfo, addressIndex+1, function(err, status) {

                        setSoldierStatus(soldierInfo, status)

                        callback(err)
                    })

                } else if(result) {

                    callback(undefined, result)

                } else {

                }

            })
        } else if(soldierInfo.addresses) {

            soldierInterfacesChainCheck(soldierInfo, 0, function(err, status) {

                setSoldierStatus(soldierInfo, status)

                callback(err)

            })

        } else {
            var err = new Error("Soldier does not have any addresses")
            setImmediate(function() {
                callback(err)
            })
        }

    }

}

function setSoldierStatus(soldierInfo, status) {

    if(!status) {
        soldierInfo.status = {
            state: State.DOWN
        }
    } else {
        soldierInfo.status = status
        soldierInfo.status.state = State.RUNNING
    }
    soldierInfo.lastUpdatedDate = new Date()
}

/** tries to get the soldier's status on each address
 * Stops when it founds a working one, stamps
 *
 * @param soldierInfo
 * @param addressIndex
 * @param callback
 */
function soldierInterfacesChainCheck(soldierInfo, addressIndex, callback) {

    var address = soldierInfo.addresses[addressIndex]

    if(address) {
        if(address.family === "IPv4") {
            logger.info("Testing address ["+address.address+":"+soldierInfo.port+"].")

            getStatus(address.address, soldierInfo.port, function(err, result) {

                if(err) {

                    logger.error("Error while retrieving soldier's status at ["+address.address+":"+soldierInfo.port+"]")
                    logger.error(err)
                    soldierInterfacesChainCheck(soldierInfo, addressIndex+1, callback)

                } else if(result) {

                    soldierInfo.lastSuccessfulAddress = address

                    callback(undefined, result)

                } else {
                    logger.info("Address ["+address.address+":"+soldierInfo.port+"] did not return any info")
                    soldierInterfacesChainCheck(soldierInfo, addressIndex+1, callback)
                }

            })

        } else {

            logger.warn("Skipping an unsupported address family ["+address.family+"]. Only IPv4 is currently supported.")

            soldierInterfacesChainCheck(soldierInfo, addressIndex+1, callback)

        }
    } else {

        // no working address found
        setImmediate(function() {
            callback(undefined, undefined)
        })
    }


}

function getStatus(address, port, callback) {

    var requestOptions = {
        hostname: address,
        port: port,
        path: "/infantry/status",
        headers: {
            "Accept": "application/json"
        },
        "method": "GET"
    }

    var statusRequest = http.request(requestOptions, function(res) {

        if(res.statusCode !== 200) {

            callback(new Error("Server response ["+res.statusCode+"]"), undefined)
            res.on('data', function (chunk) {

                logger.error(chunk)

            })
        } else {

            var response = ""

            console.log("HTTP return code ["+address+":"+port+requestOptions.path+"]. The Http response body is coming:")

            res.on('data', function (chunk) {

                response += chunk

            })

            res.on('end', function(){
                var status;

                try {

                    status = JSON.parse(response)

                } catch(err) {

                    return callback(new Error("Client response is not JSON: "+response), undefined)

                }

                callback(undefined, status)

            })


        }
    })


    statusRequest.on('error', function(e) {
        console.log("There was an error during the attempt to retrieve soldier's status at ["+address+":"+port+requestOptions.path+"].")
        console.log(e)
        callback(e, undefined)
    })

    statusRequest.end()
}

exports.handleHttpDeclaration = handleHttpDeclaration