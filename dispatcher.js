var lodash = require('lodash');
var analytics = require('analytics');
var profiler = require('screeps-profiler');

/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('dispatcher');
 * mod.thing == 'a thing'; // true
 */
 
var convertTaskToOrder = function(task) {
    var rv = null;
    // console.log('>> task', task);
    if(!task) {
        // console.log('>> Received bad task', task);
        return null;
    }
    if(task === 'harvest') {
        rv = { job: 'harvest' };
    }
    else if(task === 'upgrade') {
        rv = {
            job: 'upgrade',
        };
    }
    else if(task instanceof ConstructionSite) {
        rv = {
            job: 'build',
            target: task.id
        };
    }
    else if(task instanceof Resource) {
        // console.log('>> assignment: pick up resource');
        rv = {
            job: 'pickup',
            target: task.id
        };
    }
    else {
        if(structureNeedsEnergy(task) || task != null && task.structureType == STRUCTURE_STORAGE) {
            rv = {
                job: 'store',
                target: task.id
            };
        }
        else if((task instanceof Structure) && task.needsMaintenance()) {
            rv = {
                job: 'repair',
                target: task.id
            };
        }
        else {
            console.log('received structure with no task', task);
            rv = {
                job: 'unassigned'
            };
        }
    }
    // console.log('>> converted Task', rv.job, rv.target);
    return rv;
}

var assignWorkerJob = function(creep) {
    var tasks = creep.room.memory.tasks;
    var task = null;
    //resource return - confuses everything else
    for(let resource in creep.carry) {
        if(resource != RESOURCE_ENERGY && creep.carry[resource] > 0) {
            return {
                job: 'storeall',
                target: Game.rooms['W1N69'].storage.id
            };
        }
    }
    //resource pickup - decays 50% in 600 turns
    // This code needs work because it does not handle stuff on the far side of walls well.
    if(tasks.droppedEnergy.length > 0) {
        var energyTarget = creep.pos.findClosestByPath(tasks.droppedEnergy);
        if(energyTarget /*&& energyTarget.amount > 20*/ && creep.carry.energy < 50) {
            return {
                job: 'pickup',
                target: energyTarget.id
            }
        }
    }
    //If we're low on of energy, get energy
    if(creep.carry.energy < 40) {
        task = 'harvest';
    }
    //If nobody is upgrading, this is urgent.
    else if(creep.room.memory.upgraders.length == 0) {
        task = 'upgrade';
        // return {
        //     job: 'upgrade',
        //     target: creep.room.controller.id
        // }
    }
    //Keep a reserve of energy
    else if(tasks.needEnergy.length > 0 && creep.room.energyCapacityAvailable > creep.room.energyAvailable ) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByPath(tasks.needEnergy);
    }
    //Build new buildings
    else if(tasks.needBuilding.length > 0) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByPath(tasks.needBuilding);
        console.log(creep.name, 'assigned building');
    }
    //Maintain our buildings
    else if(tasks.needRepairs.length > 0) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByPath(tasks.needRepairs);
        // console.log(creep.name, 'assigned repair', task);
    }
    //We have extra energy to use - aggressively upgrade
    else {
        if(tasks.needEnergy.length > 0 /*&& Math.random() < 0.3*/) {
            task = tasks.needEnergy.shift();
        }
        // else if(Math.random() < 0.1) {
        //     task = creep.room.storage;
        // }
        // else {
            task = 'upgrade';
        // }
        // console.log('Selected fallback task', task);
    }
    if(!task) {
        console.log('***', creep.name, creep.pos, 'did not get a task. Energy:', creep.carry.energy);
        console.log('room energy full?', creep.room.energyCapacityAvailable, creep.room.energyCapacityAvailable,  creep.room.energyAvailable);
        console.log('specific receptacles', tasks.needEnergy.length, Game.spawns['Spawn1'].energy);
        console.log('repairs?', tasks.needRepairs, tasks.needRepairs.length);
        console.log('building?', tasks.needBuilding.length);
    }
    return convertTaskToOrder(task);
}

var structureNeedsEnergy = function(structure) {
    if(!structure) {
        console.log('got bad structure', structure);
        return false;
    }
    return (structure.structureType == STRUCTURE_EXTENSION ||
            structure.structureType == STRUCTURE_SPAWN ||
            structure.structureType == STRUCTURE_TOWER)
            && structure.energy < structure.energyCapacity;
}

var findTasks = function(room) {
    var construction = room.find(FIND_CONSTRUCTION_SITES);
    
    var needEnergy = room.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.needsEnergy()});

    var needMaintenance = room.find(FIND_STRUCTURES, {filter: (structure) => structure.needsMaintenance()});

    var needRepairs = lodash.filter(needMaintenance, (structure) => structure.needsRepairs());

    var droppedEnergy = room.find(FIND_DROPPED_RESOURCES);

    var results = {
        droppedEnergy: droppedEnergy,
        needEnergy: needEnergy,
        needMaintenance: needMaintenance,
        needRepairs: needRepairs,
        needBuilding: construction
    }
    room.memory.tasks = results;
    return results;
}

var dispatcher = {
    findTasks: findTasks,
    assignJob: assignWorkerJob,
    structureNeedsEnergy: structureNeedsEnergy
};
profiler.registerObject(dispatcher, 'dispatcher');

module.exports = dispatcher;