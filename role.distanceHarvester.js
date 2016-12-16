var analytics = require('analytics');

var roleDistanceHarvester = {

    run: function(creep) {

        // maybe do some roadwork
        if(creep.memory.harvesting == false && creep.carry.energy > 0) {
            roleDistanceHarvester.layOrRepairRoads(creep);
            // if a creep runs out of energy while doing roadwork, give it the previous harvest target
            // again as that is presumably closer
            if(creep.carry.energy == 0) {
                creep.harvesting = true;
            }
        }

        // initialize a new creep correctly
        if(creep.memory.harvesting == undefined || creep.memory.target == undefined) {
            creep.memory.harvesting = false;
            delete creep.memory.target;
        }

        // done harvesting because we dropped at storage, so get a new random target room
        if(creep.carry.energy == 0 && creep.memory.harvesting == false) {
            creep.memory.harvesting = true;
        }
        
        // done harvesting, so go home and dump in storage (doing roadwork along the way as per above)
        if(creep.carry.energy == creep.carryCapacity) {
            creep.memory.harvesting = false;
            creep.unregisterGathering();
            roleDistanceHarvester.upgradeAtDestination(creep);

        // go to the target room, then find an energy in it and nom away
        } else if(creep.memory.harvesting) {
            if(creep.room.name != Game.flags[creep.memory.flag].pos.roomName) {
                creep.moveTo(Game.flags[creep.memory.flag]);
            } else {
                if(!creep.memory.target) {
                    creep.selectSource();
                }
                let target = Game.getObjectById(creep.memory.target);
                let result = creep.gatherEnergy(target);
                if(result == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
                else if(result == ERR_NOT_ENOUGH_RESOURCES && creep.carry.energy > 20) {
                    creep.memory.harvesting = false;
                    creep.unregisterGathering();
                    roleDistanceHarvester.upgradeAtDestination(creep);
                }
            }
        } else {
            // default to going home
            roleDistanceHarvester.upgradeAtDestination(creep);
        }
    },

    storeAtHome: function(creep) {
        if(creep.room.name != Memory.home) {
            creep.moveTo(Game.rooms[Memory.home].controller);
            analytics.logStep(creep);
        } else {
            var storage = Game.rooms[Memory.home].storage;
            switch(creep.transfer(storage, RESOURCE_ENERGY)) {
                case ERR_NOT_IN_RANGE:
                    creep.loggedMove(storage);
                    break;
            }
        }
    },
    
    upgradeAtDestination: function(creep) {
        var destination = creep.memory.destination;
        if(creep.room.name != destination) {
            creep.moveTo(Game.rooms[destination].controller);
            analytics.logStep(creep);
        } else {
            var target = creep.room.controller;
            switch(creep.upgradeController(target)) {
                case ERR_NOT_IN_RANGE:
                    creep.loggedMove(target);
                    break;
            }
        }
    },

    layOrRepairRoads: function(creep) {

        var roads = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter: {'structureType': STRUCTURE_ROAD}});
        //lookFor(LOOK_STRUCTURES);
        var construction = creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3);
        //lookFor(LOOK_CONSTRUCTION_SITES);
        //Build before maintenance; we can move faster with more things if we build first, and it doesn't decay *that* fast.
        if(construction.length != 0) {
            var constructionSite = construction[0];
            // there is construction here, build it
            creep.build(constructionSite);
        }
        else if(roads.length != 0) {
            var road = roads[0];
            // there is a road here, maybe repair it
            // if(road.hits / road.hitsMax < .8) {
            if(road.needsRepairs()) {
                creep.repair(road);
            }
        }
    }
};

module.exports = roleDistanceHarvester;