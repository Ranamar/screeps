var harvester = require('role.harvester');

var structureNeedsRepairs = function(structure) {
    return (structure.hits < structure.hitsMax/2) && (structure.hits < 5000);
}

var doRepair = function(creep) {
    var targets = creep.room.find(FIND_STRUCTURES, { filter: structureNeedsRepairs });
    if(targets.length > 0) {
        var repTarget = targets[0];
        var attempt = creep.repair(repTarget);
        // console.log(creep.name, 'repairing', repTarget, attempt);
        if(attempt == ERR_NOT_IN_RANGE) {
            creep.moveTo(repTarget);
        }
        return true;
    }
    return false;
}

var doBuild = function(creep) {
    var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
    if(targets.length > 0) {
        if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0]);
        }
        return true;
    }
    else {
        return false;
    }
}

var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {

	    if(creep.memory.building && creep.carry.energy == 0) {
            creep.memory.building = false;
            creep.say('harvesting');
            console.log(creep.name, 'harvesting');
	    }
	    if(!creep.memory.building && creep.carry.energy == creep.carryCapacity) {
	        creep.memory.building = true;
	        creep.say('building');
	        console.log(creep.name, 'building');
	        harvester.unregisterGathering(creep);
	    }

	    if(creep.memory.building) {
	        if(!doBuild(creep)) {
	            doRepair(creep);
	        }
	    }
	    else {
	        harvester.gatherEnergy(creep);
	    }
	},
	
	build: doBuild,
	
	repair: doRepair
};

module.exports = roleBuilder;