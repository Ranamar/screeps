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
var exp_room = require('room.experimental');

var MINIMUM_WORKERS = 3.9;
var MAXIMUM_WORKERS = 9.2;

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
        room.memory.transportCount = 0;
        room.memory.harvesterCount = 0;
        
        if(!room.memory.targetWorkerCount) {
            room.memory.targetWorkerCount = (MINIMUM_WORKERS + MAXIMUM_WORKERS)/2;
        }
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
                colonizer.claim(creep);
                break;
            case 'reserver':
                colonizer.reserve(creep);
                break;
            case 'bleeder' :
                bleeder.doBleed(creep);
                break;
            case 'scavenger':
                bleeder.scavenge(creep);
                break;
            case 'swarm' :
                bleeder.swarm(creep);
                break;
            case 'blocker' :
                creep.moveTo(Game.flags[creep.memory.flag]);
                break;
            default:
                if(creep.memory.role == 'harvester') {
                    creep.room.memory.harvesterCount += 1;
                }
                else if(creep.memory.role == 'transport') {
                    creep.room.memory.transportCount += 1;
                }
                else if(creep.memory.role == 'upgrader') {
                    creep.room.memory.upgraderCount += 1;
                }
                experimental.runExperimental(creep);
                break;
        }
        
        // console.log('cpu used after creep', name, Game.cpu.getUsed());
    }
    console.log('cpu used this tick (end of unit AI):', Game.cpu.getUsed());
    
    for(var spawnName in Game.spawns) {
        var spawner = Game.spawns[spawnName];
        console.log(spawner.room,
                'generic:', spawner.room.memory.genericCount,
                'upgrader:', spawner.room.memory.upgraderCount,
                'remote:', distanceHarvesterCount,
                'transports:', spawner.room.memory.transportCount);
        // console.log(spawner.room, 'energy', spawner.room.energyAvailable, 'of', spawner.room.energyCapacityAvailable);
        
        //TODO: determine how I'm setting Memory.rooms.linked
        if(spawner.room.memory.upgradeLink) {
            if(spawner.room.memory.harvesterCount == 0) {
                spawner.createHarvester();
                console.log(spawner, 'spawning dedicated harvester');
            }
            else if(spawner.room.memory.transportCount == 0) {
                spawner.createCreep([CARRY, CARRY, MOVE], null, {role:'transport'});
                console.log(spawner, 'spawning transport');
            }
            else if(spawner.room.memory.upgraderCount == 0 && spawner.room.controller.level >= 5) {
                spawner.createDedicatedUpgrader({role:'upgrader', mode:'upgrader'});
                console.log(spawner, 'spawning dedicated upgrader');
            }
        }
        else if(spawner.room.memory.genericCount < MINIMUM_WORKERS) {
            spawner.createScaledWorker({role:'worker', mode:'unassigned'});
            console.log('spawning generic worker due to low count');
        }
        
        // if(!('blocker' in Game.creeps)) {
        //     spawner.createCreep([MOVE], 'blocker', {role:'blocker', flag:'blocker'});
        // }
        // else if(!('blocker2' in Game.creeps)) {
        //     spawner.createCreep([MOVE], 'blocker2', {role:'blocker', flag:'block2'});
        // }
        // else if(!('blocker3' in Game.creeps)) {
        //     spawner.createCreep([MOVE], 'blocker3', {role:'blocker', flag:'block3'});
        // }
        // else if(!('blocker4' in Game.creeps)) {
        //     spawner.createCreep([MOVE], 'blocker4', {role:'blocker', flag:'block4'});
        // }
        // else if(!('blocker5' in Game.creeps)) {
        //     spawner.createCreep([MOVE], 'blocker5', {role:'blocker', flag:'block5'});
        // }
        
        
        if(spawner.room.memory.noEnergy == true && spawner.room.memory.targetWorkerCount > MINIMUM_WORKERS) {
            spawner.room.memory.targetWorkerCount -= 0.01;
            console.log(spawner, 'target workers decreasing to', spawner.room.memory.targetWorkerCount);
        }
        else if(spawner.room.energyAvailable == spawner.room.energyCapacityAvailable) {
            if(spawner.room.memory.targetWorkerCount < MAXIMUM_WORKERS) {
                spawner.room.memory.targetWorkerCount += 1/(spawner.room.memory.genericCount*64);
                console.log(spawner, 'target workers increasing to', spawner.room.memory.targetWorkerCount);
            }
            
            if(spawner.room.memory.needsMiner) {
                console.log(spawner, 'spawning miner');
                spawner.room.memory.miner = spawner.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE], null, {role:'miner'});
                spawner.room.memory.needsMiner = false;
            }
            else if(spawner.room.memory.targetWorkerCount > spawner.room.memory.genericCount) {
                spawner.createScaledWorker({role:'worker', mode:'unassigned'});
                console.log(spawner, 'spawning generic worker due to high energy');
            }
            else if(distanceHarvesterCount < 5) {
                //These tend to truck stuff far enough that the extra capacity relative to work modules is worth it.
                spawner.createSymmetricalWorker({role:'distanceHarvester', flag:'distanceHarvestB', destination:spawner.room.name});
                console.log('Spawning remote harvester');
            }
            // else if(!('reserveB' in Game.creeps)) {
            //     spawner.createCreep([CLAIM, CLAIM, MOVE, MOVE], 'reserveB', {role:'reserver', flag:'distanceHarvestB'});
            // }
            else if(!('bleeder' in Game.creeps)) {
                let result = spawner.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE], 'bleeder', {role:'bleeder', rally:'bleedRally', noHeal: true});
                console.log('Spawning bleeder 1', result);
            }
            else if(!('bleeder2' in Game.creeps)) {
                let result = spawner.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE], 'bleeder2', {role:'bleeder', rally:'bleedRally2', noHeal: true});
                console.log('Spawning bleeder 2', result);
            }
            else if(!('bleeder3' in Game.creeps)) {
                let result = spawner.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE], 'bleeder3', {role:'bleeder', rally:'bleedRally3', noHeal: true});
                console.log('Spawning bleeder 3', result);
            }
            else if(!('bleeder4' in Game.creeps)) {
                let result = spawner.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE], 'bleeder4', {role:'bleeder', rally:'bleedRally4', noHeal: true});
                console.log('Spawning bleeder 4', result);
            }
            // else {
            //     let result = spawner.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, RANGED_ATTACK, MOVE, MOVE, HEAL, HEAL, HEAL, MOVE], null, {role:'swarm', rally:'bleedRally', target:'attack1', noHeal: true});
            //     console.log('Spawning swarmer', result);
            // }
            // else {
            //     console.log(spawner, 'spawning creep for transit');
            //     let result = spawner.createSymmetricalWorker({role:'transit', destRole:'worker', destination:'W2N68'});
            //     if(result != OK) {
            //         console.log(spawner, 'error:', result);
            //     }
            // }
        }
    }
    
    util.creepGC();
    
    console.log('cpu used this tick:', Game.cpu.getUsed());
    
    // var myRoom = Game.rooms['W1N69'];
    Memory.counter = Memory.counter + 1;
    console.log('log processing counter:', Memory.counter);
    
    if(Memory.counter >= analytics.sampleSpan) {
        Memory.counter = 0;
        for(roomName in Memory.rooms) {
            analytics.processLogs(roomName);
        }
        console.log('cpu used this tick after updating step logs:', Game.cpu.getUsed());
    }
    
});     //profiler.wrap
    
}
