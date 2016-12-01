var storeEnergyOld = function(creep) {
    var targets = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
        }
    });
    if(targets.length > 0) {
        if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0]);
        }
        return true;
    }
    else {
        return false;
    }
}

var storeEnergy = function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    var result = creep.transfer(target, RESOURCE_ENERGY);
    if(result == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
        return true;
    }
    else {
        return false;
    }
}

var storeAll = function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    for(let resource in creep.carry) {
        if(creep.carry[resource] > 0) {
            var result = creep.transfer(target, resource);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
                return true;
            }
        }
    }
    return false;
}

var stealEnergy = function(creep) {
        if(creep.carry.energy == 0) {
            var target = Game.getObjectById(creep.memory.target);
            var result = creep.withdraw(target, RESOURCE_ENERGY);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(target);
            }
        }
        else {
            var storage = Game.getObjectById('583a4d460f65cfe4148093cf');
            var result = creep.transfer(storage, RESOURCE_ENERGY);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(storage);
            }
        }
    }


module.exports = {
    storeEnergy: storeEnergy,
    
    stealEnergy: stealEnergy
};