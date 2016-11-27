var harvester = require('role.harvester');

var upgradeController = function(creep) {
    if(!creep.room.memory.upgraders.includes(creep.name)) {
        creep.room.memory.upgraders.push(creep.name);
    }
    if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller);
    }
    return true;
}

var unregisterUpgrade = function(creep) {
    var nameIndex = creep.room.memory.upgraders.indexOf(creep.name);
    if(nameIndex >= 0) {
        creep.room.memory.upgraders.splice(nameIndex, 1);
    }
}

var roleUpgrader = {

    /** @param {Creep} creep **/
    run: function(creep) {

        if(creep.memory.upgrading && creep.carry.energy == 0) {
            creep.memory.upgrading = false;
            creep.say('harvesting');
            console.log(creep.name, 'harvesting');
	    }
	    if(!creep.memory.upgrading && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.upgrading = true;
	        creep.say('upgrading');
	        console.log(creep.name, 'upgrading');
	        harvester.unregisterGathering(creep);
	    }

	    if(creep.memory.upgrading) {
            upgradeController(creep);
        }
        else {
            harvester.gatherEnergy(creep);
        }
	},
	
	upgrade: upgradeController,
	exitUpgrade: unregisterUpgrade
};

module.exports = roleUpgrader;