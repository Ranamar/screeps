/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('bleeder');
 * mod.thing == 'a thing'; // true
 */

Creep.prototype.moveToFlag = function() {
    var target = Game.flags[this.memory.flag];
    if(this.pos.roomName == target.pos.roomName) {
        return false;
    }
    else {
        this.moveTo(target);
        return true;
    }
}

module.exports = {
    scavenge: function(creep) {
        if(creep.carry.energy == 0) {
            creep.memory.seekEnergy = true;
        }
        else if(creep.carry.energy == creep.carryCapacity) {
            creep.memory.seekEnergy = false;
        }
        
        let flag = Game.flags[creep.memory.flag];
        if(creep.memory.seekEnergy) {
            if(creep.pos.roomName != flag.pos.roomName) {
                creep.moveTo(flag);
            }
            else {
                let resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
                if(resource) {
                    creep.moveTo(resource);
                    creep.pickup(resource);
                    return;
                }
                let building = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
                if(building) {
                    creep.moveTo(building);
                    if(building.structureType == STRUCTURE_SPAWN && building.energy > 0) {
                        let result = creep.withdraw(building, RESOURCE_ENERGY);
                    }
                    else {
                        creep.dismantle(building);
                    }
                    return;
                }
                console.log('Scavenger', creep.name, creep.pos, 'has no targets');
            }
        }
        else {
            let storage = Game.rooms[creep.memory.home].storage;
            creep.moveTo(storage);
            creep.transfer(storage, RESOURCE_ENERGY);
        }
    },
    dismantle: function(creep) {
        if(creep.moveToFlag()) {
            return;
        }
        var target = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER});
        creep.moveTo(target);
        creep.dismantle(target);
    },
    doBleed: function(creep) {
        if(!creep.memory.inPosition) {
            var targetPos = Game.rooms['W1N69'].getPositionAt(1, 27);
            console.log(creep.name, 'bleeder getting in position', creep.pos, targetPos, creep.memory.inPosition);
            creep.moveTo(targetPos);
            if(creep.pos.x == targetPos.x && creep.pos.y == targetPos.y) {
                creep.memory.inPosition = true;
            }
        }
        else {
            var hits = creep.hits;
            var max = creep.hitsMax;
            console.log(creep.name, 'bleeder operating', hits, max, creep.pos);
            if(hits < max) {
                var result = creep.heal(creep);
                console.log(creep.name, 'healing', result);
            }
            else {
                var ally = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax });
                var rangeToAlly = creep.pos.getRangeTo(ally);
                if(rangeToAlly == 1) {
                    creep.heal(ally);
                }
                else if(rangeToAlly <= 3) {
                    creep.rangedHeal(ally);
                }
            }
            var room = creep.room;
            if(room.name != 'W1N69') {
                var enemyStructures = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 3);
                if(enemyStructures.length > 0) {
                    creep.rangedMassAttack();
                    console.log(creep.name, 'smartbombing structures');
                }
                else {
                    var roads = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter: (structure) => structure.structureType == STRUCTURE_ROAD});
                    var fired = false;
                    // for(var i = 0; !fired && i < roads.length; i++) {
                    //     var road = roads[i];
                    //     if(road.hits == road.hitsMax) {
                    //         creep.rangedAttack(road);
                    //         console.log(creep.name, 'firing on undamaged road at', road.pos);
                    //         fired = true;
                    //     }
                    // }
                    if(!fired) {
                        var hostiles = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3);
                        if(hostiles.length == 1) {
                            creep.rangedAttack(hostiles[0])
                        }
                        else if(hostiles.length > 1) {
                            creep.rangedMassAttack();
                        }
                        // else if(roads.length > 0 && roads[0].hits > 2000) {
                        //     creep.rangedAttack(roads[0]);
                        //     console.log(creep.name, 'firing on damaged road at', roads[0].pos);
                        // }
                        // else {
                        //     var walls = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter: (structure) => structure.structureType == STRUCTURE_WALL});
                        //     creep.rangedAttack(walls[0]);
                        // }
                    }
                }
            }
            if(creep.memory.aggressive == true && room.name != 'W1N69') {
                var target = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES,
                            {filter: (structure) => !(structure.structureType == STRUCTURE_CONTROLLER /*||
                                                        structure.structureType == STRUCTURE_STORAGE*/)});
                // var targets = creep.room.find(FIND_HOSTILE_CREEPS);
                // if(targets.length > 0) {
                //     creep.moveTo(targets[0]);
                // }
                creep.moveTo(target);
            }
            if((max - hits)/12 > creep.ticksToLive) {
                creep.move(LEFT);
                console.log(creep.name, 'charging; ticks to live:', creep.ticksToLive);
            }
            else if(hits >= (max - 99) && (room.name == 'W1N69' || creep.pos.x == 49)) {
                var result = creep.move(LEFT);
                // console.log('>> bleeder moving left', result);
            }
            else if(hits < max && (room.name != 'W1N69' || creep.pos.x == 0)) {
                var result = creep.move(RIGHT);
                // console.log('>> bleeder moving right', result);
            }
            else {
                // console.log('>> bleeder waiting');
            }
        }
    },
    scout: function(creep) {
        if(!creep.memory.inPosition) {
            var targetPos = Game.rooms['W1N69'].getPositionAt(1, 27);
            console.log(creep.name, 'bleeder getting in position', creep.pos, targetPos, creep.memory.inPosition);
            creep.moveTo(targetPos);
            if(creep.pos.x == targetPos.x && creep.pos.y == targetPos.y) {
                creep.memory.inPosition = true;
            }
        }
        else {
            creep.move(LEFT);
        }
    },
    killCreeps: function(creep) {
        if(creep.moveToFlag()) {
            return;
        }
        var target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if(creep.pos.isNearTo(target)) {
            creep.rangedMassAttack();
        }
        else {
            creep.rangedAttack(target);
            creep.moveTo(target);
        }
    },
    clearWalls: function(creep) {
        if(creep.pos.roomName != creep.memory.destination) {
            console.log(creep.name, creep.pos.roomName, creep.memory.destination);
            creep.moveToNewRoom();
            return;
        }
        let target = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_WALL}});
        if(target) {
            console.log(creep.name, creep.pos.roomName, 'target', target);
            creep.moveTo(target);
            creep.rangedAttack(target);
        }
        else {
            console.log(creep.name, 'no walls in', creep.room.roomName);
        }
    }
};