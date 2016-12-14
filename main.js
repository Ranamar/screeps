var util = require('util');
var spawnCreeps = require('spawn.creeps');
var towerFirer = require('structure.tower');
var dispatcher = require('dispatcher');
var worker = require('worker.base');
var maintenance = require('structure.maintenance');
var energy = require('structure.energy');
var bleeder = require('bleeder');
var analytics = require('analytics');
var distanceHarvest = require('role.distanceHarvester');
var miner = require('miner');
var colonizer = require('role.colonizer');
var experimental = require('worker.experimental');
// var exp_room = require('room.experimental');

var MINIMUM_WORKERS = 5.5;
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
        
        room.checkMiner();
        
        //prep maintenance role counts by room
        room.memory.genericCount = 0;
        room.memory.upgraderCount = 0;
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

        switch(creep.memory.role) {
            case 'generic':
            case 'worker':
                creep.room.memory.genericCount += 1;
                if(!creep.memory.mode || creep.memory.mode == 'unassigned') {
                    var job = dispatcher.assignJob(creep);
                    creep.assignJob(job);
                }
                creep.work();
                break;
            case 'distanceHarvester':
                distanceHarvesterCount += 1;
                distanceHarvest.run(creep);
                break;
            case 'miner':
                creep.mine();
                break;
            case 'transit':
                transitCount += 1;
                creep.moveToNewRoom();
                break;
            case 'colonizer':
                colonizer.run(creep);
                break;
            default:
                creep.room.memory.upgraderCount += 1;
                experimental.runExperimental(creep);
                break;
        }
        
        // console.log('cpu used after creep', name, Game.cpu.getUsed());
    }
    console.log('cpu used this tick (end of unit AI):', Game.cpu.getUsed());
    
    for(var spawnName in Game.spawns) {
        var spawner = Game.spawns[spawnName];
        console.log(spawner.room,
                'generic:', spawner.room.memory.genericCount, 'upgrader', spawner.room.memory.upgraderCount, 'remote:', distanceHarvesterCount, 'in transit:', transitCount);
        // console.log(spawner.room, 'energy', spawner.room.energyAvailable, 'of', spawner.room.energyCapacityAvailable);
        
        if(spawner.room.memory.genericCount < MINIMUM_WORKERS) {
            spawner.createScaledWorker({role:'worker', mode:'unassigned'});
            console.log('spawning generic worker due to low count');
        }
        else if(spawner.room.memory.needsMiner) {
            console.log(spawner, 'spawning miner');
            spawner.room.memory.miner = spawner.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], null, {role:'miner'});
            spawner.room.memory.needsMiner = false;
        }
        if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > MINIMUM_WORKERS) {
            spawner.room.memory.targetWorkerCount -= 0.002;
            console.log(spawner, 'target workers decreasing to', spawner.room.memory.targetWorkerCount);
        }
        else if(spawner.room.energyAvailable == spawner.room.energyCapacityAvailable) {
            if(spawner.room.memory.targetWorkerCount < MAXIMUM_WORKERS) {
                spawner.room.memory.targetWorkerCount += 1/(spawner.room.memory.genericCount*64);
                console.log(spawner, 'target workers increasing to', spawner.room.memory.targetWorkerCount);
            }
            
            if(spawner.room.memory.targetWorkerCount > spawner.room.memory.genericCount) {
                spawner.createScaledWorker({role:'worker', mode:'unassigned'});
                console.log('spawning generic worker due to high energy');
            }
            else if(distanceHarvesterCount < 5) {
                //These tend to truck stuff far enough that the extra capacity relative to work modules is worth it.
                spawner.createSymmetricalWorker({role:'distanceHarvester', flag:'distanceHarvestB', destination:'W3N69'});
                console.log('Spawning remote harvester');
            }
            else if(spawner.room.memory.upgraderCount == 0 && spawner.room.controller.level > 5) {
                spawner.createDedicatedUpgrader({role:'upgrader', mode:'upgrader'});
            }
            // else if(Math.random() < 0.1) {
            //     //We expect these to be going off-road, so symmetrical is a lot better than the alternative.
            //     spawner.createSymmetricalWorker({role:'transit', destination: 'W3N69', destRole:'worker'});
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