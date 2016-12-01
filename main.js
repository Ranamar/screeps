var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleStorage = require('role.store');
var util = require('util');
var towerFirer = require('towerFirer');
var dispatcher = require('dispatcher');
var worker = require('worker.base');
var structureBase = require('structures.base');
// var bleeder = require('bleeder');
var analytics = require('analytics');
var distanceHarvest = require('role.distanceHarvester');

var MINIMUM_WORKERS = 5.5;

var profiler = require('screeps-profiler');
profiler.enable();

module.exports.loop = function () {
    
profiler.wrap(function() {
    
    console.log('--------');
    console.log('CPU used at start of tick', Game.cpu.getUsed());

    var tasks = dispatcher.findTasks(Game.spawns['Spawn1'].room);
    console.log('cpu used this tick after dispatcher:', Game.cpu.getUsed());

    towerFirer.fire('W1N69');
    console.log('cpu used this tick after tower firing:', Game.cpu.getUsed());

    //count maintenance roles
    var harvesterCount = 0;
    var upgraderCount = 0;
    var builderCount = 0;
    var genericCount = 0;
    var distanceHarvesterCount = 0;
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        // console.log(creep.name, creep.ticksToLive);
        
        // if(creep.ticksToLive < 100) {
        //     var success = Game.spawns['Spawn1'].recycleCreep(creep);
        //     console.log('reclaiming creep', creep.name, creep.ticksToLive, success);
        // }
        // if(creep.memory.role == 'harvester') {
        //     roleHarvester.run(creep);
        //     harvesterCount += 1;
        // }
        // else if(creep.memory.role == 'upgrader') {
        //     roleUpgrader.run(creep);
        //     upgraderCount += 1;
        // }
        // else if(creep.memory.role == 'builder') {
        //     roleBuilder.run(creep);
        //     builderCount += 1;
        // }
        if(creep.memory.role == 'generic') {
            // console.log('generic', creep.name, creep.memory.mode);
            genericCount += 1;
            if(creep.memory.mode == 'unassigned') {
                var job = dispatcher.assignJob(creep, tasks);
                // console.log('generic', creep.name, job.job, job.target);
                creep.assignJob(job);
            }
            else {
                creep.work();
            }
            analytics.logStep(creep);
        }
        else if(creep.memory.role == 'distanceHarvester') {
            distanceHarvesterCount += 1;
            distanceHarvest.run(creep);
            analytics.logStep(creep);
        }
        // else if(creep.memory.role == 'thief') {
        //     roleStorage.stealEnergy(creep);
        // }
        // else if(creep.memory.role == 'scout') {
        //     bleeder.scout(creep);
        // }
        // console.log('cpu used after creep', name, Game.cpu.getUsed());
    }
    console.log('cpu used this tick (end of unit AI):', Game.cpu.getUsed());
    
    console.log(/*'harvesters:', harvesterCount, 'upgraders:', upgraderCount, 'builders:', builderCount,*/
                'generic:', genericCount, 'remote:', distanceHarvesterCount);
    
    var spawner = Game.spawns['Spawn1'];
    if(genericCount < MINIMUM_WORKERS) {
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
    // else if(!('scout' in Game.creeps)) {
    //     var result = spawner.createCreep([TOUGH, MOVE], 'scout', {'role': 'scout', 'inPosition': false});
    //     console.log('spawning scout', result);
    // }
    else if(distanceHarvesterCount < 1) {
        util.createScalingCreep(spawner, 'distanceHarvester');
        console.log('Spawning remote harvester');
    }
    if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > MINIMUM_WORKERS) {
        spawner.room.memory.targetWorkerCount -= 0.002;
        console.log('target workers', spawner.room.memory.targetWorkerCount);
    }
    else if(spawner.room.energyAvailable == Game.spawns['Spawn1'].room.energyCapacityAvailable) {
        spawner.room.memory.targetWorkerCount += 1/(genericCount*64);
        console.log('target workers', spawner.room.memory.targetWorkerCount);
        if(spawner.room.memory.targetWorkerCount > genericCount) {
            util.createScalingCreep(spawner, 'generic');
            console.log('spawning generic worker due to high energy');
        }
    }
    
    util.creepGC();
    
    console.log('cpu used this tick:', Game.cpu.getUsed());
    
    var myRoom = Game.rooms['W1N69'];
    myRoom.memory.counter = myRoom.memory.counter + 1;
    console.log('log processing counter:', myRoom.memory.counter);
    
    if(myRoom.memory.counter >= 250) {
        myRoom.memory.counter = 0;
        analytics.processLogs(myRoom);
        console.log('cpu used this tick after updating step logs:', Game.cpu.getUsed());
    }
    
});     //profiler.wrap
    
}