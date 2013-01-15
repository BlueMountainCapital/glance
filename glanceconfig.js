/*jslint browser:true*/
/*globals $,glance,Metric*/
/* Copyright 2013 BlueMountain Capital */

(function () {
    "use strict";
    var hostCompare = function (a, b) {
        var aname = a.alias,
            bname = b.alias,
            order = {
                c: 1,
                o: 2,
                f: 3
            },
            amachinetype = aname.substr(2, 1),
            bmachinetype = bname.substr(2, 1),
            afarm = aname.substr(0, 2),
            bfarm = bname.substr(0, 2),
            amachinenum = aname.substr(3, aname.indexOf(":") - 3),
            bmachinenum = bname.substr(3, bname.indexOf(":") - 3);
        if (amachinetype !== bmachinetype) {
            if (order[amachinetype] === null || order[bmachinetype] === null) {
                if (amachinetype > bmachinetype) {
                    return 1;
                }
                return -1;
            } else {
                if (order[amachinetype] > order[bmachinetype]) {
                    return 1;
                }
                return -1;
            }
        }
        if (afarm !== bfarm) {
            if (afarm > bfarm) {
                return 1;
            }
            return -1;
        }
        if (amachinenum !== bmachinenum) {
            if (amachinenum > bmachinenum) {
                return 1;
            }
            return -1;
        }
        return 0;
    },
        byMetric = function (a, b) {
            var aalias = a.alias,
                balias = b.alias,
                ametric = aalias.substr(aalias.indexOf(':')),
                bmetric = balias.substr(balias.indexOf(':')),
                hc = hostCompare(a, b);
            if (ametric === bmetric) {
                return hc;
            }
            return ametric > bmetric ? 1 : -1;
        },
        byNetworkPreference = function (a, b) {
            var hc = hostCompare(a, b);
            if (hc === 0) {
                return -byMetric(a, b);
            }
            return hc;
        };

    glance.page("", 'Dashboard', 'dashboard');
    glance.page("cpu-usage", "CPU Usage")
        .search("*.cpu")
        .asPercent(1.0)
        .sort(hostCompare);
    glance.page("network", 'Network')
        .search("*.eth0.rx.bytes")
        .search("*.eth0.tx.bytes")
        .call(function (metric) {
            if (metric.name.indexOf(".rx") > 0) {
                metric.name = "scale(" + metric.name + ",-1)";
            }
        }).sort(byNetworkPreference);
    glance.page("olympus", 'Olympus')
        .search("*MDCACHE*.cpu")
        .search("*OLYMPUS*.cpu")
        .asPercent(1.0)
        .search("*MDCACHE*.mds.*")
        .search("*OLYMPUS*.mds.*")
        .keepLast()
        .sort(byMetric);
    glance.page("cassandra", 'C*')
        .search("*.cassandra.db.prod4.tsdata.*")
        .search("*.cassandra.db.prod4.tsdata_cache")
        .search("*.cassandra.heap_used_mb")
        .search("*.cassandra.pending_compactions")
        .keepLast()
        .sort(byMetric);
    glance.page("dev-test", 'scratchpad', 'edit')
        .search("nycassandra05.cpu")
        .search("nycassandra06.cpu")
        .sort(byMetric);

    glance.graphiteHandler("http://nycassandra05")
        .alias(
            function (name) {
                var nameSplit = name.split('.'),
                    machineName,
                    metric = ":",
                    machineNumber,
                    farm;
                if (nameSplit.length < 3) {
                    return name;
                }

                machineName = nameSplit[2].toLowerCase();
                nameSplit.slice(3).forEach(function (s) {
                    if (s !== nameSplit[3]) {
                        metric = metric + ".";
                    }
                    metric = metric + s;
                });

                machineNumber = parseInt(machineName.substr(machineName.length - 3), 10)
                    ? machineName.substr(machineName.length - 3)
                    : machineName.substr(machineName.length - 2);
                farm = machineName.substr(0, 2);

                if (machineName.indexOf("farm") >= 0) {
                    return farm + "f" + machineNumber + metric;
                }
                if (machineName.indexOf("cassandra") >= 0) {
                    return farm + "c" + machineNumber + metric;
                }
                if (machineName.indexOf("mdcache") >= 0 || machineName.indexOf("olympus") >= 0) {
                    return farm + "o" + machineNumber + metric;
                }
                if (nameSplit[0] === "corp" && nameSplit[1] === "bcna") {
                    return machineName + metric;
                }
                return name;
            }
        ).startSearches("corp.bcna.");
}());
