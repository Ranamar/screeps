/*
 * This is where my proof-of-concept hacks go.
 */

var dedicatedUpgrader = function(creep) {
    if(creep.carry.energy < 10) {
        let target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => (structure.structureType === STRUCTURE_LINK)});
        let result = creep.withdraw(target, RESOURCE_ENERGY);
        console.log(creep.name, 'trying to get energy', target, result);
        if(result == ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
        }
    }
    if(creep.carry.energy >= 10) {
        let target = creep.room.controller;
        let result = creep.upgradeController(target);
        console.log(creep.name, 'trying to upgrade', target, result);
        if(result == ERR_NOT_IN_RANGE) {
            creep.moveTo(target);
        }
    }
}

module.exports.runExperimental = function(creep) {
    switch(creep.memory.role) {
        case 'upgrader':
            dedicatedUpgrader(creep);
            break;
        default:
            break;
    }
}
