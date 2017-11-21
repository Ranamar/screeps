/*
 * This is where my proof-of-concept hacks go.
 */


var dedicatedUpgrader = function(creep) {
    if(creep.carry.energy < 15) {
        // let target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => (structure.structureType === STRUCTURE_LINK)});
        let target = Game.getObjectById(creep.memory.link);
        if(target.energy < 400) {
            console.log(creep.name, 'forcing energy pull for', target);
            target.pullEnergy();
        }
        let result = creep.withdraw(target, RESOURCE_ENERGY);
        // console.log(creep.name, 'trying to get energy', target, result);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
    }
    if(creep.carry.energy > 0) {
        let target = creep.room.controller;
        let result = creep.upgradeController(target);
        // console.log(creep.name, 'trying to upgrade', target, result);
        if(result == ERR_NOT_IN_RANGE && creep.carry.energy > 15) {
            creep.loggedMove(target);
        }
    }
}

var dedicatedHarvester = function(creep) {
    let target = Game.getObjectById(creep.memory.target);
    let result = creep.harvest(target);
    if(result == ERR_NOT_IN_RANGE || result == ERR_NOT_ENOUGH_RESOURCES) {
        creep.loggedMove(target);
    }
    else if(result != OK) {
        console.log(creep.name, creep.pos, 'got harvest error', result);
    }
    
    if(creep.carry.energy > 20) {
        let link = Game.getObjectById(creep.memory.link);
        if(link.energy > 750) {
            link.pushEnergy();
        }
        result = creep.transfer(link, RESOURCE_ENERGY);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(link);
        }
    }
}

Creep.prototype.linkUpgraderInit = function() {
    this.registerUpgrading();
    let linkTarget = this.room.controller.pos.findClosestByRange(FIND_STRUCTURES, {filter: (structure) => (structure.structureType === STRUCTURE_LINK)});
    this.memory.link = linkTarget.id;
}

Creep.prototype.linkHarvesterInit = function() {
    console.log(this.name, 'initializing harvester');
    let sources = this.room.memory.energySources;
    for(let i = 0; i < sources.length; i++) {
        if(sources[i].link && !(sources[i].dedicatedHarvester in Game.creeps)) {
            console.log('dedicated harvester', this.name, 'selecting source', sources[i].id);
            sources[i].miners.push(this.name);
            sources[i].dedicatedHarvester = this.name;
            this.memory.target = sources[i].id;
            this.memory.link = sources[i].link;
            return;
        }
        console.log(sources[i], 'has dedicated harvester', sources[i].dedicatedHarvester)
    }
}

Room.prototype.getSourceLinks = function() {
    var sourceLinks = [];
    let sources = this.memory.energySources;
    for(let i = 0; i < sources.length; i++) {
        if(sources[i].link) {
            sourceLinks.push(Game.getObjectById(sources[i].link));
        }
    }
    return sourceLinks;
}

var energyTransport = function(creep) {
    if(creep.carry.energy == 0 && !creep.memory.collecting) {
        // console.log(creep.name, 'no energy, not collecting');
        creep.memory.storing = false;
        creep.memory.collecting = true;
        // if(creep.room.memory.tasks.droppedEnergy.length > 0) {
        //     creep.memory.target = creep.room.memory.tasks.droppedEnergy[0].id;
        //     creep.memory.pickup = true;
        // }
        // else {
            // creep.memory.pickup = false;
            let sourceLinks = creep.room.getSourceLinks();
            let targetLink = creep.pos.findClosestByPath(sourceLinks, {filter: (link) => link.energy >= 100});
            if(!targetLink) {
                // Something has gone wrong, like no energy to get
                creep.memory.collecting = false;
                return;
            }
            creep.memory.target = targetLink.id;
        // }
    }
    else if(creep.carry.energy > 0 && !creep.memory.storing) {
        // console.log(creep.name, 'energy, not storing');
        creep.memory.storing = true;
        creep.memory.collecting = false;
        //Find a place to store
        let closest = creep.pos.findClosestByPath(creep.room.memory.tasks.needEnergy, {filter: (structure) => structure.structureType != STRUCTURE_LINK});
        if(closest) {
            creep.memory.target = closest.id;
        }
        else {
            if(creep.room.terminal && creep.room.terminal.store[RESOURCE_ENERGY] < 50000) {
                creep.memory.target = creep.room.terminal.id;
            }
            else if(creep.room.storage) {
                creep.memory.target = creep.room.storage.id;
            }
            else {
                creep.memory.storing = false;
            }
        }
    }
    // else {
    //     console.log(creep.name, 'transport not changing state; storing:', creep.memory.storing, 'collecting:', creep.memory.collecting);
    // }
    let target = Game.getObjectById(creep.memory.target);
    if(creep.memory.storing) {
        let result;
        // if(creep.memory.pickup) {
        //     result = creep.pickup(target);
        // }
        // else {
            result = creep.transfer(target, RESOURCE_ENERGY);
        // }
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
        else if(result == OK || result == ERR_FULL) {
            creep.memory.storing = false;
        }
    }
    else if(creep.memory.collecting) {
        let result = creep.withdraw(target, RESOURCE_ENERGY);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
        else if(result == OK || result == ERR_FULL || result == ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.collecting = false;
        }
    }
}

//XXX This is a quick hack to pay a ransom.
var shiftMinerals = function(creep) {
    if(!creep.carry[RESOURCE_HYDROGEN] && !creep.memory.collecting) {
        console.log(creep.name, 'no minerals, not collecting');
        creep.memory.storing = false;
        creep.memory.collecting = true;
        if(creep.room.storage) {
            creep.memory.target = creep.room.storage.id;
        }
        else {
            console.log(creep.name, 'is missing a storage unit');
            creep.memory.collecting = false;
        }
    }
    else if(creep.carry[RESOURCE_HYDROGEN] > 0 && !creep.memory.storing) {
        console.log(creep.name, 'minerals, not storing');
        creep.memory.storing = true;
        creep.memory.collecting = false;
        //Find a place to store
        if(creep.room.terminal) {
            creep.memory.target = creep.room.terminal.id;
        }
        else {
            console.log(creep.name, 'has nowhere to shift minerals to.');
            creep.memory.storing = false;
        }
    }
    let target = Game.getObjectById(creep.memory.target);
    if(creep.memory.storing) {
        let result;
        result = creep.transfer(target, RESOURCE_HYDROGEN);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
        else if(result == OK || result == ERR_FULL) {
            creep.memory.storing = false;
        }
    }
    else if(creep.memory.collecting) {
        let result = creep.withdraw(target, RESOURCE_HYDROGEN);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
        else if(result == OK || result == ERR_FULL || result == ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.collecting = false;
        }
    }
}

module.exports.runExperimental = function(creep) {
    switch(creep.memory.role) {
        case 'upgrader':
            dedicatedUpgrader(creep);
            break;
        case 'transport':
            energyTransport(creep);
            break;
        case 'harvester':
            dedicatedHarvester(creep);
            break;
        case 'gofer':
            shiftMinerals(creep);
            break;
        default:
            break;
    }
}

module.exports.initExperimental = function(creep) {
    switch(creep.memory.role) {
        case 'upgrader':
            creep.linkUpgraderInit();
            break;
        case 'harvester':
            creep.linkHarvesterInit();
            break;
        case 'transport':
            break;
        default:
            break;
    }
}
