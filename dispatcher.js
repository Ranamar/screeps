var lodash = require('lodash');
var analytics = require('analytics');

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
    // console.log('task', task);
    if(!task) {
        console.log('>> Received bad task', task);
        return null;
    }
    if(task === 'harvest') {
        rv = { job: 'harvest' };
    }
    else if(task === 'upgrade') {
        rv = { job: 'upgrade' };
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
    else {
        if(structureNeedsEnergyExpanded(task) || task != null && task.structureType == STRUCTURE_STORAGE) {
            rv = {
                job: 'store',
                target: task.id
            };
        }
        // else if(structureNeedsRepairs(task)) {
        else if((task instanceof Structure) && task.needsRepairs()) {
            rv = {
                job: 'repair',
                target: task.id
            };
        }
        else {
            //TODO: investigate null tasks
            console.log('received structure with no task', task, task instanceof Structure);
            if(task instanceof Structure) {
                console.log('needs repairs?', task, task.hits, task.hitsMax, task.needsRepairs());
            }
            else {
                console.log('not a structure', task);
            }
            rv = {
                job: 'unassigned'
            };
        }
    }
    // console.log('converted Task', rv, rv.job);
    return rv;
}

var assignWorkerJob = function(creep, tasks) {
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
        if(energyTarget && energyTarget.amount > 40 && creep.carryCapacity - creep.carry.energy >= 50) {
            return {
                job: 'pickup',
                target: energyTarget.id
            }
        }
    }
    //If we're out of energy, get energy
    if(creep.carry.energy < 20) {
        task = 'harvest';
    }
    //If nobody is upgrading, this is urgent.
    else if(creep.room.memory.upgraders.length == 0) {
        task = 'upgrade';
    }
    //Keep a reserve of energy
    else if(tasks.needEnergy.length > 0 && creep.room.energyCapacityAvailable*0.8 > creep.room.energyAvailable) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByRange(tasks.needEnergy);
        //Fill spawn last? it might reclaim something - disabled
        // if(task.structureType == STRUCTURE_SPAWN && tasks.needEnergy.length > 0) {
        //     tasks.needEnergy.push(task);
        //     task = tasks.needEnergy.shift();
        // }
    }
    //Build new buildings
    else if(tasks.needBuilding.length > 0) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByRange(tasks.needBuilding);
    }
    //Maintain our buildings
    else if(tasks.needRepairs.length > 0) {
        //findClosestByPath randomly uses a ton of cpu if the stars align
        task = creep.pos.findClosestByRange(tasks.needRepairs);
        console.log(creep.name, 'assigned repair', task);
    }
    //We have extra energy to use - aggressively upgrade
    else {
        console.log('Checking fallback tasks');
        if(tasks.needEnergy.length > 0 /*&& Math.random() < 0.3*/) {
            task = tasks.needEnergy.shift();
        }
        // We skip the spawner up above; save it for last
        else if(Game.spawns['Spawn1'].energy < Game.spawns['Spawn1'].energyCapacity) {
            task = Game.spawns['Spawn1'];
        }
        // else if(Math.random() < 0.1) {
        //     task = creep.room.storage;
        // }
        else {
            task = 'upgrade';
        }
    }
    if(!task) {
        console.log('***', creep.name, 'did not get a task. energy:', creep.carry.energy);
        console.log('room energy full?', creep.room.energyCapacityAvailable, creep.room.energyCapacityAvailable*0.9,  creep.room.energyAvailable);
        console.log('specific receptacles', tasks.needEnergy.length, Game.spawns['Spawn1'].energy);
        console.log('repairs?', tasks.needRepairs, tasks.needRepairs.length);
        console.log('building?', tasks.needBuilding.length);
    }
    return convertTaskToOrder(task);
}

var structureNeedsEnergyExpanded = function(structure) {
    if(!structure) {
        console.log('got bad structure (exp)', structure);
        return false;
    }
    return (structure.structureType == STRUCTURE_EXTENSION ||
            structure.structureType == STRUCTURE_SPAWN ||
            structure.structureType == STRUCTURE_TOWER)
            && structure.energy < structure.energyCapacity;
}

var structureNeedsEnergy = function(structure) {
    if(!structure) {
        console.log('got bad structure', structure);
        return false;
    }
    return (structure.structureType == STRUCTURE_EXTENSION ||
//            structure.structureType == STRUCTURE_SPAWN ||     //disable so it can possibly use the energy from reclaiming creeps that go by; we generally don't miss it
            structure.structureType == STRUCTURE_TOWER)
            && structure.energy < structure.energyCapacity;
}

var structureNeedsRepairs = function(structure) {
    if(!structure) {
        console.log('bad repair target', structure);
        return false;
    }
    var dynamicScore = true;
    if(structure.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(structure.pos) > 0;
    }
    return dynamicScore && (structure.hits < structure.hitsMax/2) && (structure.hits < 25000);
}

var findTasks = function(room) {
    var construction = room.find(FIND_CONSTRUCTION_SITES);
    
    var needEnergy = room.find(FIND_MY_STRUCTURES, {filter: structureNeedsEnergy});

    var needRepairs = room.find(FIND_STRUCTURES, {filter: (structure) => structure.needsRepairs()});

    var droppedEnergy = room.find(FIND_DROPPED_RESOURCES);

    var results = {
        droppedEnergy: droppedEnergy,
        needEnergy: needEnergy,
        needRepairs: needRepairs,
        needBuilding: construction
    }
    room.memory.tasks = results;
    return results;
}

module.exports = {
    findTasks: findTasks,
    assignJob: assignWorkerJob
};