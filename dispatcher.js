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
    console.log('task', task);
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
        if(structureNeedsEnergy(task)) {
            rv = {
                job: 'store',
                target: task.id
            };
        }
        else if(structureNeedsRepairs(task)) {
            rv = {
                job: 'repair',
                target: task.id
            }
        }
        else {
            console.log('received structure with no task', task, task.hits);
        }
    }
    // console.log('converted Task', rv, rv.job);
    return rv;
}

var assignWorkerJob = function(creep, tasks) {
    var task = null;
    //energy pickup - decays 50% in 600 turns
    if(tasks.droppedEnergy.length > 0) {
        console.log('>>', creep.name, 'checking dropped energy');
        for(var i = 0; i < tasks.droppedEnergy.length; i++) {
            var energyTarget = tasks.droppedEnergy[i];
            console.log('>>', energyTarget, energyTarget.amount, energyTarget.pos);
            if(energyTarget.amount > 40 && creep.carryCapacity - creep.carry.energy >= 50) {
                tasks.droppedEnergy = tasks.droppedEnergy.slice(i, 1);
                console.log('>>', creep.name, 'assigned', energyTarget);
                return {
                    job: 'pickup',
                    target: energyTarget.id
                };
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
    else if(creep.room.energyCapacityAvailable*3 > (creep.room.energyAvailable * 4)) {
        task = creep.pos.findClosestByPath(tasks.needEnergy);
        //Fill spawn last? it might reclaim something - disabled
        // if(task.structureType == STRUCTURE_SPAWN && tasks.needEnergy.length > 0) {
        //     tasks.needEnergy.push(task);
        //     task = tasks.needEnergy.shift();
        // }
    }
    //Maintain our buildings
    else if(tasks.needRepairs.length > 0) {
        task = creep.pos.findClosestByPath(tasks.needRepairs);
    }
    //Build new buildings
    else if(tasks.needBuilding.length > 0) {
        task = tasks.needBuilding.shift();
    }
    //We have extra energy to use - aggressively upgrade
    else {
        if(tasks.needEnergy.length > 0 /*&& Math.random() < 0.3*/) {
            task = tasks.needEnergy.shift();
        }
        //We skip the spawner up above; save it for last
        else if(creep.room.spawns['Spawn1'].energy < creep.room.spawns['Spawn1'].energyCapacity) {
            task = creep.room.spawns['Spawn1'];
        }
        else {
            task = 'upgrade';
        }
    }
    return convertTaskToOrder(task);
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
    return structure.hits < structure.hitsMax/2
            && structure.hits < 5000;
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