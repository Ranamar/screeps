/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('bleeder');
 * mod.thing == 'a thing'; // true
 */
var profiler = require('screeps-profiler');
var roleDistanceHarvester = require('role.distanceHarvester');

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

Creep.prototype.autoHeal = function() {
    let ally = this.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax });
    let rangeToAlly = this.pos.getRangeTo(ally);
    if(rangeToAlly <= 1) {
        // console.log(this.name, 'healing close ally', ally.name, 'range', rangeToAlly);
        return this.heal(ally);
    }
    else if(rangeToAlly <= 3) {
        // console.log(this.name, 'healing far ally', ally.name, 'range', rangeToAlly);
        return this.rangedHeal(ally);
    }
    else {
        return ERR_NOT_IN_RANGE;
    }
}

Creep.prototype.autoAttack = function() {
    let target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(!target || this.pos.getRangeTo(target) > 3) {
        target = this.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
    }
    if(!target) {
        return;
    }
    if(this.pos.isNearTo(target)) {
        this.rangedMassAttack();
        this.attack(target);
    }
    else {
        this.rangedAttack(target);
    }
}

var bleeders = {
    scavenge: function(creep) {
        if(creep.hitsMax - creep.hits > 200) {
            creep.memory.mode = 'retreat';
        }
        else if(creep.carry.energy == 0 || creep.memory.mode == 'retreat' && creep.carry.energy < creep.carryCapacity) {
            creep.memory.mode = 'dismantle';
        }
        else if(creep.carry.energy == creep.carryCapacity) {
            creep.memory.mode = 'deliver';
        }
        let flag;
        switch(creep.memory.mode) {
            case 'retreat':
                flag = Game.flags[creep.memory.retreat];
                creep.loggedMove(flag);
                break;
            case 'dismantle':
                flag = Game.flags[creep.memory.target];
                if(creep.pos.roomName != flag.pos.roomName) {
                    creep.loggedMove(flag);
                }
                else {
                    let resource = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES);
                    if(resource) {
                        creep.loggedMove(resource);
                        creep.pickup(resource);
                        return;
                    }
                    let building = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {filter: (structure) => structure.structureType != STRUCTURE_CONTROLLER});
                    //code to scavenge walls too
                    let wall = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (structure) => structure.structureType == STRUCTURE_WALL});
                    if(!building || creep.pos.getRangeTo(wall) < creep.pos.getRangeTo(building)) {
                        building = wall;
                    }
                    if(building) {
                        creep.loggedMove(building);
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
                break;
            case 'deliver':
                if(creep.pos.roomName != creep.memory.home) {
                    creep.loggedMove(Game.rooms[creep.memory.home].storage);
                    return;
                }
                let storage =
                    creep.pos.findClosestByPath(FIND_MY_STRUCTURES,
                        {filter:(structure) => structure.structureType == STRUCTURE_LINK || structure.structureType == STRUCTURE_STORAGE});
                    // Game.rooms[creep.memory.home].storage;
                roleDistanceHarvester.layOrRepairRoads(creep);
                creep.loggedMove(storage);
                creep.transfer(storage, RESOURCE_ENERGY);
                break;
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
    swarm: function(creep) {
        let attackResult = creep.autoAttack();
        let healResult = creep.autoHeal();
        let rally = Game.flags[creep.memory.rally].pos;
        if(!creep.memory.inPosition) {
            console.log(creep.name, 'swarmer getting in position', creep.pos, rally, creep.memory.inPosition);
            creep.loggedMove(rally);
            if(creep.pos.x == rally.x && creep.pos.y == rally.y) {
                creep.memory.inPosition = true;
            }
        }
        else {
            if(creep.hitsMax - creep.hits > creep.hitsMax/5) {
                // console.log(creep.name, 'swarmer retreating', creep.hitsMax, creep.hits);
                creep.moveTo(rally);
            }
            else if(healResult != ERR_NOT_IN_RANGE) {
                // console.log(creep.name, 'swarmer swarming ally');
                let ally = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax });
                if(ally.hitsMax - ally.hits > ally.hitsMax/5) {
                    creep.moveTo(ally);
                }
                else {
                    // console.log(creep.name, 'swarmer swarming target');
                    let target = Game.flags[creep.memory.target].pos;
                    creep.moveTo(target);
                }
            }
            else {
                // console.log(creep.name, 'swarmer swarming target');
                let target = Game.flags[creep.memory.target].pos;
                creep.moveTo(target);
            }
        }
    },
    medic: function(creep) {
        let rally = Game.flags[creep.memory.rally].pos;
        if(!creep.memory.inPosition) {
            console.log(creep.name, 'medic getting in position', creep.pos, rally, creep.memory.inPosition);
            creep.loggedMove(rally);
            if(creep.pos.x == rally.x && creep.pos.y == rally.y) {
                creep.memory.inPosition = true;
            }
            creep.autoHeal();
        }
        else {
            if(creep.hitsMax - creep.hits > creep.hitsMax/10) {
                console.log('medic', creep.name, 'taking too much damage', creep.hits, creep.hitsMax);
                creep.loggedMove(rally);
                creep.heal(creep);
                return;
            }
            let ally = creep.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax });
            let rangeToAlly = creep.pos.getRangeTo(ally);
            if(creep.pos.roomName != rally.roomName || ally == null || creep.pos.isEdge()) {
                creep.loggedMove(rally);
            }
            else if(rangeToAlly > 1) {
                creep.loggedMove(ally);
            }
            if(rangeToAlly <= 1) {
                console.log(creep.name, 'healing close ally', ally.name, 'range', rangeToAlly);
                creep.heal(ally);
            }
            else if(rangeToAlly <= 3) {
                console.log(creep.name, 'healing far ally', ally.name, 'range', rangeToAlly);
                creep.rangedHeal(ally);
            }
        }
    },
    doBleed: function(creep) {
        // Comment this out to make them run
        // creep.memory.inPosition = false;
        let rally = Game.flags[creep.memory.rally].pos;
        if(!creep.memory.inPosition) {
            console.log(creep.name, 'bleeder getting in position', creep.pos, rally, creep.memory.inPosition);
            creep.loggedMove(rally);
            if(creep.pos.x == rally.x && creep.pos.y == rally.y) {
                creep.memory.inPosition = true;
            }
        }
        else {
            let hits = creep.hits;
            let max = creep.hitsMax;
            // console.log(creep.name, 'operating', hits, max, creep.pos);
            creep.autoHeal();
            let room = creep.room;
            // if(room.name == rally.roomName) {
                if(max - hits < 150) {
                    // if(creep.memory.target) {
                    let target = Game.flags[creep.memory.target].pos;
                    creep.moveTo(target);
                    // }
                    // else {
                    // creep.move(TOP);
                    // }
                }
                else {
                    creep.moveTo(rally);
                }
            // }
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
profiler.registerObject(bleeders, 'bleeder');

module.exports = bleeders;