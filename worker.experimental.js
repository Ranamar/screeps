/*
 * This is where my proof-of-concept hacks go.
 */

var gatherMineral = function(creep, mineral) {
    var result = creep.harvest(mineral);
    console.log(creep.name, creep.pos, 'mining result', result, 'holding', creep.carry[mineral.mineralType], mineral.mineralType);
    if(result != OK) {
        result = creep.moveTo(mineral);
        console.log(creep.name, creep.pos, 'moving to mine', result);
    }
}

var storeMineral = function(creep) {
    var target = creep.room.storage;
    var result = creep.storeAny(target);
    if(result != OK) {
        creep.moveTo(target);
    }
}

var harvestMineral = function(creep) {
    var mineralList = creep.room.find(FIND_MINERALS);
    if(mineralList) {
        var mineral = mineralList[0];
        if(creep.memory.storing && !creep.carry[mineral.mineralType]) {
            creep.memory.storing = false;
            creep.say('mining');
            console.log(creep.name, creep.pos, 'mining');
        }
        if(!creep.memory.storing && creep.carry[mineral.mineralType] == creep.carryCapacity) {
            creep.memory.storing = true;
            creep.say('storing');
            console.log(creep.name, creep.pos, 'storing mineral');
        }
        if(creep.memory.storing) {
            storeMineral(creep);
        }
        else {
            gatherMineral(creep, mineral);
        }
    }
    else {
        console.log(creep.name, creep.pos, "can't find minerals");
    }
}

module.exports.runExperimental = function(creep) {
    switch(creep.memory.role) {
        case 'miner':
            harvestMineral(creep);
            break;
        default:
            break;
    }
}
