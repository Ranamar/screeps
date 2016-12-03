// var roleStorage = require('role.store');
var util = require('util');
var towerFirer = require('towerFirer');
var dispatcher = require('dispatcher');
var worker = require('worker.base');
var maintenance = require('structures.maintenance');
// var bleeder = require('bleeder');
var analytics = require('analytics');
var distanceHarvest = require('role.distanceHarvester');
// var colonizer = require('role.colonizer');

var MINIMUM_WORKERS = 5.5;

var profiler = require('screeps-profiler');
profiler.enable();

module.exports.loop = function () {
    
profiler.wrap(function() {
    
    console.log('--------');
    console.log('CPU used at start of tick', Game.cpu.getUsed());

    for(roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        // console.log('examining room', room);
        if(room.controller.owner && room.controller.owner.username == 'Ranamar') {
            // console.log('is owned by me');
            dispatcher.findTasks(room);
        }
        //prep maintenance role counts by room
        room.memory.genericCount = 0;
        room.memory.distanceHarvesterCount = 0;
    }
    console.log('cpu used this tick after dispatcher:', Game.cpu.getUsed());

    towerFirer.fire('W1N69');
    console.log('cpu used this tick after tower firing:', Game.cpu.getUsed());

    //count maintenance roles
    var transitCount = 0;
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        // console.log(creep.name, creep.ticksToLive);
        
        // if(creep.ticksToLive < 100) {
        //     var success = Game.spawns['Spawn1'].recycleCreep(creep);
        //     console.log('reclaiming creep', creep.name, creep.ticksToLive, success);
        // }
        if(creep.memory.role == 'generic') {
            // console.log('generic', creep.name, creep.memory.mode);
            creep.room.memory.genericCount += 1;
            if(creep.memory.mode == 'unassigned') {
                var job = dispatcher.assignJob(creep);
                // console.log('generic', creep.name, job.job, job.target);
                creep.assignJob(job);
            }
            else {
                creep.work();
            }
            analytics.logStep(creep);
        }
        else if(creep.memory.role == 'distanceHarvester') {
            creep.room.memory.distanceHarvesterCount += 1;
            distanceHarvest.run(creep);
            analytics.logStep(creep);
        }
        // else if(creep.memory.role == 'colonize') {
        //     colonizer.run(creep);
        // }
        else if(creep.memory.role == 'transit') {
            transitCount += 1;
            creep.moveToNewRoom();
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
                'generic:', spawner.room.memory.genericCount, 'remote:', spawner.room.memory.distanceHarvesterCount, 'in transit:', transitCount);
    
        if(spawner.room.memory.genericCount < MINIMUM_WORKERS) {
            util.createScalingCreep(spawner, {role:'generic'});
            console.log('spawning generic worker due to low count');
        }
        // else if(spawner.room.memory.distanceHarvesterCount < 1) {
        //     util.createScalingCreep(spawner, {role:'distanceHarvester', destination:'W2N68'});
        //     console.log('Spawning remote harvester');
        // }
        if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > MINIMUM_WORKERS) {
            spawner.room.memory.targetWorkerCount -= 0.002;
            console.log(spawner, 'target workers decreasing to', spawner.room.memory.targetWorkerCount);
        }
        else if(spawner.room.energyAvailable == spawner.room.energyCapacityAvailable) {
            spawner.room.memory.targetWorkerCount += 1/(spawner.room.memory.genericCount*64);
            console.log(spawner, 'target workers increasing to', spawner.room.memory.targetWorkerCount);
            if(spawner.room.memory.targetWorkerCount > spawner.room.memory.genericCount) {
                util.createScalingCreep(spawner, {role:'generic'});
                console.log('spawning generic worker due to high energy');
            }
            // else {
            //     util.createScalingCreep(spawner, {role:'transit', destination: 'W2N68', destRole:'generic'});
            //     console.log('spawning worker for export');
            // }
        }
    }
    
    util.creepGC();
    
    console.log('cpu used this tick:', Game.cpu.getUsed());
    
    var myRoom = Game.rooms['W1N69'];
    myRoom.memory.counter = myRoom.memory.counter + 1;
    console.log('log processing counter:', myRoom.memory.counter);
    
    if(myRoom.memory.counter >= 250) {
        myRoom.memory.counter = 0;
        for(roomName in Memory.rooms) {
            analytics.processLogs(Game.rooms[roomName]);
        }
        console.log('cpu used this tick after updating step logs:', Game.cpu.getUsed());
    }
    
});     //profiler.wrap
    
}