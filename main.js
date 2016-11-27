var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var util = require('util');
var towerFirer = require('towerFirer');
var dispatcher = require('dispatcher');
var worker = require('worker.base');
var visualizer = require('visualizer');

module.exports.loop = function () {
    console.log('--------');
    towerFirer.fire('W1N69');

    var tasks = dispatcher.findTasks(Game.spawns['Spawn1'].room);
    console.log('cpu used this tick (after dispatcher):', Game.cpu.getUsed());

    //count maintenance roles
    var harvesterCount = 0;
    var upgraderCount = 0;
    var builderCount = 0;
    var genericCount = 0;
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        // console.log(creep.name, creep.ticksToLive);
        
        if(creep.ticksToLive < 100) {
            var success = Game.spawns['Spawn1'].recycleCreep(creep);
            console.log('reclaiming creep', creep.name, creep.ticksToLive, success);
        }
        else if(creep.memory.role == 'harvester') {
            roleHarvester.run(creep);
            harvesterCount += 1;
        }
        if(creep.memory.role == 'upgrader') {
            roleUpgrader.run(creep);
            upgraderCount += 1;
        }
        if(creep.memory.role == 'builder') {
            roleBuilder.run(creep);
            builderCount += 1;
        }
        if(creep.memory.role == 'generic') {
            // console.log('generic', creep.name, creep.memory.mode);
            genericCount += 1;
            if(creep.memory.mode == 'unassigned') {
                var job = dispatcher.assignJob(creep, tasks);
                // console.log('generic', creep.name, job.job, job.target);
                worker.assignJob(creep, job);
            }
            else {
                worker.run(creep);
            }
        }
        visualizer.logStep(creep);
    }
    console.log('cpu used this tick (end of unit AI):', Game.cpu.getUsed());
    
    console.log('harvesters:', harvesterCount, 'upgraders:', upgraderCount, 'builders:', builderCount, 'generic:', genericCount);
    var spawner = Game.spawns['Spawn1'];
    if(genericCount < 8) {
        util.createScalingCreep(spawner, 'generic');
        console.log('spawning generic worker due to low count');
    }
    // else if(harvesterCount < 0) {
    //     spawner.createCreep( [WORK, WORK, CARRY, CARRY, MOVE, MOVE], null, {'role':'harvester'});
    //     console.log('spawning harvester');
    // }
    // else if(upgraderCount < 0) {
    //     spawner.createCreep( [WORK, WORK, CARRY, CARRY, MOVE, MOVE], null, {'role':'upgrader'});
    //     console.log('spawning upgrader');
    // }
    // else if(builderCount < 0) {
    //     spawner.createCreep( [WORK, WORK, CARRY, CARRY, MOVE, MOVE], null, {'role':'builder'});
    //     console.log('spawning builder');
    // }
    else if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > 8) {
        spawner.room.memory.targetWorkerCount -= 0.001;
        console.log('target workers', spawner.room.memory.targetWorkerCount);
    }
    else if(spawner.room.energyAvailable == Game.spawns['Spawn1'].room.energyCapacityAvailable) {
        spawner.room.memory.targetWorkerCount += 1/(genericCount*16);
        console.log('target workers', spawner.room.memory.targetWorkerCount);
        if(spawner.room.memory.targetWorkerCount > genericCount) {
            util.createScalingCreep(spawner, 'generic');
            console.log('spawning generic worker due to high energy');
        }
    }
    
    util.creepGC();
    
    console.log('cpu used this tick:', Game.cpu.getUsed());
}