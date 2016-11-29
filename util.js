/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('util');
 * mod.thing == 'a thing'; // true
 */

var createScalingCreep = function(spawn, role) {
    var energy = spawn.room.energyAvailable;
    var block = [WORK, CARRY, MOVE];
    var blockCost = 200;
    var totalCost = 0;
    var largest = [];
    while(totalCost + blockCost <= energy) {
        largest = largest.concat(block);
        totalCost += blockCost;
    }
    var result = spawn.createCreep(largest, null, {'role': role});
    console.log(result);
}

var cleanEnergyTracking = function(room, name) {
    var energySources = Memory.rooms[room].energySources;
    if(!energySources) {
        //TODO: better fix
        return;
    }
    for(var i = 0; i <energySources.length; i++) {
        var source = energySources[i];
        var j = 0;
        while(j < source.miners.length) {
            if(source.miners[j] == name) {
                source.miners.splice(j, 1);
                console.log('garbage collected', name, 'source', i, 'location', j);
            }
            else {
                j = j+1;
            }
        }
    }
}

var cleanUpgradeTracking = function(room, name) {
    var upgraders = Memory.rooms[room].upgraders;
    if(!upgraders) {
        //TODO: better fix
        return;
    }
    var i = 0;
    while(i < upgraders.length) {
        if(upgraders[i] == name) {
            upgraders.splice(i, 1);
            console.log('garbage collected', name, 'upgrader: index', i);
        }
        else {
            i = i+1;
        }
    }
}

module.exports = {
    creepGC: function() {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                //Clean up any tracking lists it was on
                for(var room in Memory.rooms) {
                    cleanEnergyTracking(room, name);
                    cleanUpgradeTracking(room, name);
                }
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        }
    },
    
    createScalingCreep: createScalingCreep
};
