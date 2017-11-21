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
    if(!task) {
        console.log('>> Received bad task', task);
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
        rv = {
            job: 'pickup',
            target: task.id
        };
    }
    else if((task instanceof Structure) && task.needsRepairs()) {
        rv = {
            job: 'repair',
            target: task.id
        };
    }
    else if(task.needsEnergy() || task.structureType == STRUCTURE_STORAGE) {
        rv = {
            job: 'store',
            target: task.id
        };
    }
    else {
        console.log('received structure with no task', task);
        rv = {
            job: 'unassigned'
        };
    }
    return rv;
}

var assignWorkerJob = function(creep) {
    var tasks = creep.room.memory.tasks;
    if(!tasks) {
        //TODO: solution for this sort of thing
        return null;
    }
    var task = null;
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
    //resource return - confuses everything else but pickup
    if(creep.room.storage) {
        for(let resource in creep.carry) {
            if(resource != RESOURCE_ENERGY && creep.carry[resource] > 0) {
            return {
                    job: 'storeall',
                    target: creep.room.storage.id
                };
            }
        }
    }
    //If we're low on of energy, get energy
    if(creep.carry.energy < 40) {
        task = 'harvest';
    }
    //If nobody is upgrading, this is urgent.
    else if(!creep.room.memory.upgraders || creep.room.memory.upgraders.length == 0) {
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
        else {
            task = 'upgrade';
        }
    }
    if(!task) {
        console.log('***', creep.name, creep.pos, 'did not get a task. Energy:', creep.carry.energy);
        console.log('room energy full?', creep.room.energyCapacityAvailable, creep.room.energyCapacityAvailable,  creep.room.energyAvailable);
        console.log('repairs?', tasks.needRepairs, tasks.needRepairs.length);
        console.log('building?', tasks.needBuilding.length);
    }
    else if(task == creep.room.storage) {
        console.log('***', creep.name, creep.pos, 'assigned to store at storage');
        console.log('room energy full?', creep.room.energyCapacityAvailable, creep.room.energyCapacityAvailable,  creep.room.energyAvailable);
        console.log('repairs?', tasks.needRepairs, tasks.needRepairs.length);
        console.log('building?', tasks.needBuilding.length);
    }
    return convertTaskToOrder(task);
}
profiler.registerFN(assignWorkerJob, 'dispatcher.assignWorkerJob');

var assignJob = function(creep) {
    switch(creep.memory.role) {
        case 'generic':
        case 'worker':
            return assignWorkerJob(creep);
        default:
            return null;
    }
}

var refreshTasks = function(room) {
    var construction = lodash.map(room.memory.tasks.needBuilding, (entry) => Game.getObjectById(entry.id));
    construction = lodash.filter(construction, (site) => site != undefined);
    var needEnergy = lodash.map(room.memory.tasks.needEnergy, (entry) => Game.getObjectById(entry.id));
    needEnergy = lodash.filter(needEnergy, (structure) => structure && structure.needsEnergy());
    var needMaintenance = lodash.map(room.memory.tasks.needMaintenance, (entry) => Game.getObjectById(entry.id));
    needMaintenance = lodash.filter(needEnergy, (structure) => structure && structure.needsMaintenance());
    var needRepairs = lodash.map(room.memory.tasks.needRepairs, (entry) => Game.getObjectById(entry.id));
    needRepairs = lodash.filter(needRepairs, (structure) => structure && structure.needsRepairs())
    var droppedEnergy = room.find(FIND_DROPPED_RESOURCES);
    
    var results = {
        droppedEnergy: droppedEnergy,
        needEnergy: needEnergy,
        needMaintenance: needMaintenance,
        needRepairs: needRepairs,
        needBuilding: construction,
        staleness: room.memory.tasks.staleness + 1
    }
    
    return results;
}

var searchTasks = function(room) {
    console.log('>> refreshing tasks from game state');
    var construction = room.find(FIND_CONSTRUCTION_SITES);
    
    var needEnergy = room.find(FIND_MY_STRUCTURES, {filter: (structure) => structure.needsEnergy()});

    var needMaintenance = room.find(FIND_STRUCTURES, {filter: (structure) => structure.needsMaintenance()});

    var needRepairs =  room.find(FIND_STRUCTURES, {filter: (structure) => structure.needsRepairs()});

    var droppedEnergy = room.find(FIND_DROPPED_RESOURCES);

    var results = {
        droppedEnergy: droppedEnergy,
        needEnergy: needEnergy,
        needMaintenance: needMaintenance,
        needRepairs: needRepairs,
        needBuilding: construction,
        staleness: 0
    };
    
    return results;
}

var findTasks = function(room) {
    var results;
    
    //TODO magic numbers
    if(!room.memory.tasks || room.memory.tasks.staleness > 15) {
        results = dispatcher.searchTasks(room);
    }
    else {
        results = dispatcher.refreshTasks(room);
    }
    
    room.memory.tasks = results;
    return results;
}

var dispatcher = {
    findTasks: findTasks,
    assignJob: assignJob,
    searchTasks: searchTasks,
    refreshTasks: refreshTasks
};
profiler.registerObject(dispatcher, 'dispatcher');

module.exports = dispatcher;
