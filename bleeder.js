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

Creep.prototype.autoHeal = function() {
    let hits = this.hits;
    let max = this.hitsMax;
    if(hits < max) {
        console.log(this.name, 'healing self');
        return this.heal(this);
    }
    else {
        let ally = this.pos.findClosestByRange(FIND_MY_CREEPS, { filter: (creep) => creep.hits < creep.hitsMax });
        let rangeToAlly = this.pos.getRangeTo(ally);
        if(rangeToAlly == 1) {
            console.log(this.name, 'healing close ally', ally.name, 'range', rangeToAlly);
            return this.heal(ally);
        }
        else if(rangeToAlly <= 3) {
            console.log(this.name, 'healing far ally', ally.name, 'range', rangeToAlly);
            return this.rangedHeal(ally);
        }
        else {
            return ERR_NOT_IN_RANGE;
        }
    }
}

Creep.prototype.autoAttack = function() {
    let target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if(!target) {
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
    swarm: function(creep) {
        creep.autoHeal();
        let rally = Game.flags[creep.memory.rally].pos;
        if(!creep.memory.inPosition) {
            console.log(creep.name, 'swarmer getting in position', creep.pos, rally, creep.memory.inPosition);
            creep.loggedMove(rally);
            if(creep.pos.x == rally.x && creep.pos.y == rally.y) {
                creep.memory.inPosition = true;
            }
        }
        else {
            creep.autoAttack();
            if(creep.hitsMax - creep.hits > 80) {
                console.log(creep.name, 'swarmer retreating', creep.hitsMax, creep.hits);
                creep.moveTo(rally);
            }
            else {
                console.log(creep.name, 'swarmer swarming target');
                let target = Game.flags[creep.memory.target].pos;
                creep.moveTo(target);
            }
        }
    },
    doBleed: function(creep) {
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
            console.log(creep.name, 'operating', hits, max, creep.pos);
            creep.autoHeal();
            let room = creep.room;
            // if(room.name == rally.roomName) {
                if(max - hits < 96) {
                    creep.move(TOP);
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