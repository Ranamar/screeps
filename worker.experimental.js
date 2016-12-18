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
    if(creep.carry.energy >= 15) {
        let target = creep.room.controller;
        let result = creep.upgradeController(target);
        // console.log(creep.name, 'trying to upgrade', target, result);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
    }
}

var dedicatedHarvester = function(creep) {
    let target = Game.getObjectById(creep.memory.target);
    let result = creep.harvest(target);
    if(result == ERR_NOT_IN_RANGE) {
        console.log('>> harvester', creep.name, 'moving to energy')
        creep.loggedMove(target);
    }
    else if(result != OK) {
        console.log('>> harvester', creep.name, 'got harvest error', result);
    }
    
    if(creep.carry.energy > 10) {
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
    console.log(creep.name, creep.carry.energy, 'of', creep.carryCapacity)
    if(creep.carry.energy == 0 && !creep.memory.collecting) {
        creep.memory.storing = false;
        creep.memory.collecting = true;
        let sourceLinks = creep.room.getSourceLinks();
        let targetLink = creep.pos.findClosestByPath(sourceLinks, {filter: (link) => link.energy >= 100});
        if(!targetLink) {
            // Something has gone wrong, like no energy to get
            creep.memory.collecting = false;
            return;
        }
        creep.memory.target = targetLink.id;
        console.log(creep.name, 'collecting at', creep.memory.target);
    }
    else if(creep.carry.energy > 0 && !creep.memory.storing) {
        creep.memory.storing = true;
        creep.memory.collecting = false;
        //Find a place to store
        let closest = creep.pos.findClosestByPath(creep.room.memory.tasks.needEnergy, {filter: (structure) => structure.structureType != STRUCTURE_LINK});
        if(!closest) {
            closest = creep.room.storage;
        }
        creep.memory.target = closest.id;
        console.log(creep.name, 'storing at', creep.memory.target);
    }
    let target = Game.getObjectById(creep.memory.target);
    console.log(creep.name, 'target', target, 'collecting', creep.memory.collecting, 'storing', creep.memory.storing);
    if(creep.memory.storing) {
        let result = creep.transfer(target, RESOURCE_ENERGY);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
        }
        else if(result == OK || result == ERR_FULL) {
            creep.memory.storing = false;
        }
    }
    else {
        let result = creep.withdraw(target, RESOURCE_ENERGY);
        if(result == ERR_NOT_IN_RANGE) {
            creep.loggedMove(target);
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
