var storing = require('role.store');

var selectSource = function(creep) {
    var sources = creep.room.memory.energySources;
    if(creep.memory.targetIndex == undefined) {
        var leastIndex = 0;
        var leastCount = Number.MAX_VALUE;
        for(var i = 0; i < sources.length; i++) {
            if(sources[i].miners.length <= leastCount) {
                leastIndex = i;
                leastCount = sources[i].miners.length;
            }
        }
        creep.memory.targetIndex = leastIndex;
        sources[leastIndex].miners.push(creep.name);
        console.log('Assigning least used location', creep.memory.targetIndex, sources[creep.memory.targetIndex].miners.length);
    }
    return Game.getObjectById(sources[creep.memory.targetIndex].id);
}

var gatherEnergy = function(creep) {
    var target = selectSource(creep);
    var result = creep.harvest(target);
    if(result == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
    }
    else if(result == ERR_NOT_ENOUGH_RESOURCES) {
        creep.room.memory.noEnergy = true;
        //Get close anyway.
        creep.moveTo(target);
    }
    else if(result == OK) {
        creep.room.memory.noEnergy = false;
    }
    return true;
}

var gatherDroppedEnergy = function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    if(target) {
        var result = creep.pickup(target);
        // console.log('>>', creep.name, 'pickup result', result);
        if(result == ERR_NOT_IN_RANGE) {
            // console.log('>>', creep.name, 'moving to pickup target');
            creep.moveTo(target);
        }
        else if(result == ERR_FULL || result == ERR_INVALID_TARGET) {
            // console.log('>>', creep.name, 'gives up on pickup');
            //we can't do this; do something else
            return false;
        }
        return true;
    }
    else {
        // console.log('>>', creep.name, 'pickup target disappeared');
        //energy disappeared!
        return false;
    }
}

var unregisterGathering = function(creep) {
    // console.log('unregistering mining', creep.name, creep.memory.targetIndex);
    if(creep.memory.targetIndex != undefined) {
        // console.log('removing mining target', creep.memory.targetIndex);
        var source = creep.room.memory.energySources[creep.memory.targetIndex];
        var nameIndex = source.miners.indexOf(creep.name);
        // console.log(creep.name, creep.memory.targetIndex, nameIndex);
        // for(var miner in source.miners) {
        //     console.log(source.miners[miner]);
        // }
        if(nameIndex >= 0) {
            source.miners.splice(nameIndex, 1);
            // console.log('spliced', source.miners.length);
            // for(var miner in source.miners) {
            //     console.log(source.miners[miner]);
            // }
        }
        creep.memory.targetIndex = undefined;
    }
}

var roleHarvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.storing && creep.carry.energy == 0) {
            creep.memory.storing = false;
            creep.say('harvesting');
            console.log(creep.name, 'harvesting');
	    }
	    if(!creep.memory.storing && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.storing = true;
	        creep.say('storing');
	        console.log(creep.name, 'storing');
	        unregisterGathering(creep);
	    }
        
	    if(creep.memory.storing) {
            storing.storeEnergy(creep);
        }
        else {
            gatherEnergy(creep);
        }
	},
	
	gatherEnergy: gatherEnergy,
	pickupEnergy: gatherDroppedEnergy,
	
	unregisterGathering: unregisterGathering
};

module.exports = roleHarvester;