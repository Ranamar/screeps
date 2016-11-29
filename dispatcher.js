var lodash = require('lodash');

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
        else if(structureNeedsRepairs(task)) {
            rv = {
                job: 'repair',
                target: task.id
            };
        }
        else {
            //TODO: investigate null tasks
            console.log('received structure with no task', task);
            rv = {
                job: 'unassigned'
            };
        }
    }
    console.log('converted Task', rv, rv.job);
    return rv;
}

var assignWorkerJob = function(creep, tasks) {
    var task = null;
    //energy pickup - decays 50% in 600 turns
    //This code needs work because it does not handle stuff on the far side of walls well.
    // if(tasks.droppedEnergy.length > 0) {
    //     // console.log('>>', creep.name, 'checking dropped energy');
    //     for(var i = 0; i < tasks.droppedEnergy.length; i++) {
    //         var energyTarget = tasks.droppedEnergy[i];
    //         // console.log('>>', energyTarget, energyTarget.amount, energyTarget.pos);
    //         if(energyTarget.amount > 40 && creep.carryCapacity - creep.carry.energy >= 50) {
    //             tasks.droppedEnergy = tasks.droppedEnergy.slice(i, 1);
    //             // console.log('>>', creep.name, 'assigned', energyTarget);
    //             return {
    //                 job: 'pickup',
    //                 target: energyTarget.id
    //             };
    //         }
    //     }
    // }
    //If we're out of energy, get energy
    if(creep.carry.energy < 20) {
        task = 'harvest';
    }
    //If nobody is upgrading, this is urgent.
    else if(creep.room.memory.upgraders.length == 0) {
        task = 'upgrade';
    }
    //Keep a reserve of energy
    else if(tasks.needEnergy.length > 0 && (creep.room.energyCapacityAvailable*0.9) > creep.room.energyAvailable) {
        task = creep.pos.findClosestByPath(tasks.needEnergy);
        //Fill spawn last? it might reclaim something - disabled
        // if(task.structureType == STRUCTURE_SPAWN && tasks.needEnergy.length > 0) {
        //     tasks.needEnergy.push(task);
        //     task = tasks.needEnergy.shift();
        // }
    }
    //Build new buildings
    else if(tasks.needBuilding.length > 0) {
        task = creep.pos.findClosestByPath(tasks.needBuilding);
    }
    //Maintain our buildings
    else if(tasks.needRepairs.length > 0) {
        task = creep.pos.findClosestByPath(tasks.needRepairs);
        console.log('assigned', task);
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
        else if(Math.random() < 0.1) {
            task = creep.room.storage;
        }
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
            structure.structureType == STRUCTURE_SPAWN ||     //disable so it can possibly use the energy from reclaiming creeps that go by; we generally don't miss it
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
    //TODO investigate this
    if(!structure) {
        console.log('bad repair target', structure);
        return false;
    }
    var tileFlags = structure.room.lookForAt(LOOK_FLAGS, structure.pos);
    return (tileFlags.length > 0) && (structure.hits < structure.hitsMax/2) && (structure.hits < 25000);
    // return structure.hits < structure.hitsMax/2
    //         && structure.hits < 25000;
}

var findTasks = function(room) {
    var construction = room.find(FIND_CONSTRUCTION_SITES);
    
    var buildings = room.find(FIND_MY_STRUCTURES);
    var needEnergy = lodash.filter(buildings, structureNeedsEnergy);

    var needRepairs = lodash.filter(buildings, structureNeedsRepairs);
    var neutStructs = room.find(FIND_STRUCTURES, {filter: { structureType: STRUCTURE_ROAD }});
    var neutNeedRepairs = lodash.filter(neutStructs, structureNeedsRepairs);
    Array.prototype.push.apply(needRepairs, neutNeedRepairs);

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