var util = require('util');
var towerFirer = require('structures.towers');
var dispatcher = require('dispatcher');
var worker = require('worker.base');
var maintenance = require('structures.maintenance');
// var bleeder = require('bleeder');
var analytics = require('analytics');
var distanceHarvest = require('role.distanceHarvester');
// var colonizer = require('role.colonizer');
var experimental = require('worker.experimental');

var MINIMUM_WORKERS = 6.5;
var MAXIMUM_WORKERS = 13.5;

var profiler = require('screeps-profiler');
profiler.enable();

module.exports.loop = function () {
    
profiler.wrap(function() {
    
    console.log('--------');
    console.log('CPU used at start of tick', Game.cpu.getUsed());

    for(var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        // console.log('examining room', room);
        if(room.controller && room.controller.owner && room.controller.owner.username == 'Ranamar') {
            // console.log('is owned by me');
            dispatcher.findTasks(room);
        }
        towerFirer.fire(roomName);
        
        //prep maintenance role counts by room
        room.memory.genericCount = 0;
    }
    var distanceHarvesterCount = 0;
    console.log('cpu used this tick after dispatcher and tower firing:', Game.cpu.getUsed());

    //count maintenance roles
    var transitCount = 0;
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.spawning) {
            continue;
        }
        // console.log(creep.name, creep.ticksToLive);
        
        // if(creep.ticksToLive < 100) {
        //     var success = Game.spawns['Spawn1'].recycleCreep(creep);
        //     console.log('reclaiming creep', creep.name, creep.ticksToLive, success);
        // }
        if(creep.memory.role == 'generic') {
            // console.log('generic', creep.name, creep.memory.mode);
            creep.room.memory.genericCount += 1;
            if(!creep.memory.mode || creep.memory.mode == 'unassigned') {
                var job = dispatcher.assignJob(creep);
                // console.log(creep.name, 'unassigned; finding job:', job.job);
                creep.assignJob(job);
            }
            // console.log('generic', creep.name, creep.memory.mode, creep.memory.target);
            creep.workerMove();
        }
        else if(creep.memory.role == 'distanceHarvester') {
            distanceHarvesterCount += 1;
            distanceHarvest.run(creep);
            // analytics.logStep(creep);
        }
        // else if(creep.memory.role == 'colonize') {
        //     colonizer.run(creep);
        // }
        else if(creep.memory.role == 'transit') {
            transitCount += 1;
            creep.moveToNewRoom();
        }
        else {
            experimental.runExperimental(creep);
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
    
    for(var spawnName in Game.spawns) {
        var spawner = Game.spawns[spawnName];
        console.log(spawner.room,
                'generic:', spawner.room.memory.genericCount, 'remote:', distanceHarvesterCount, 'in transit:', transitCount);
    
        if(spawner.room.memory.genericCount < MINIMUM_WORKERS) {
            util.createScalingCreep(spawner, {role:'generic', mode:'unassigned'});
            console.log('spawning generic worker due to low count');
        }
        // else if(distanceHarvesterCount < 2) {
        //     util.createScalingCreep(spawner, {role:'distanceHarvester', destination:'W2N68'});
        //     console.log('Spawning remote harvester');
        // }
        // else if(spawnName == 'Spawn1' && !('Miner' in Memory.creeps)) {
        //     console.log('spawning miner');
        //     Game.spawns.Spawn1.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], 'Miner', {role:'miner'});
        // }
        if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > MINIMUM_WORKERS) {
            spawner.room.memory.targetWorkerCount -= 0.002;
            console.log(spawner, 'target workers decreasing to', spawner.room.memory.targetWorkerCount);
        }
        else if(spawner.room.energyAvailable == spawner.room.energyCapacityAvailable && spawner.room.memory.targetWorkerCount < MAXIMUM_WORKERS) {
            spawner.room.memory.targetWorkerCount += 1/(spawner.room.memory.genericCount*64);
            console.log(spawner, 'target workers increasing to', spawner.room.memory.targetWorkerCount);
            if(spawner.room.memory.targetWorkerCount > spawner.room.memory.genericCount) {
                util.createScalingCreep(spawner, {role:'generic', mode:'unassigned'});
                console.log('spawning generic worker due to high energy');
            }
            else if(distanceHarvesterCount < 1) {
                util.createScalingCreep(spawner, {role:'distanceHarvester', destination:'W2N68'});
                console.log('Spawning remote harvester');
            }
            // else {
            //     util.createScalingCreep(spawner, {role:'transit', destination: 'W2N68', destRole:'generic'});
            //     console.log('spawning worker for export');
            // }
        }
    }
    
    util.creepGC();
    
    console.log('cpu used this tick:', Game.cpu.getUsed());
    
    // var myRoom = Game.rooms['W1N69'];
    Memory.counter = Memory.counter + 1;
    console.log('log processing counter:', Memory.counter);
    
    if(Memory.counter >= 250) {
        Memory.counter = 0;
        for(roomName in Memory.rooms) {
            analytics.processLogs(roomName);
        }
        console.log('cpu used this tick after updating step logs:', Game.cpu.getUsed());
    }
    
});     //profiler.wrap
    
}