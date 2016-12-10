var lodash = require('lodash');

Creep.prototype.selectSource = function() {
    var sources = this.room.memory.energySources;
    if(this.memory.target == undefined) {
        var leastIndex = 0;
        var leastCount = Number.MAX_VALUE;
        var source = null;
        for(var i = 0; i < sources.length; i++) {
            source = Game.getObjectById(sources[i].id);
            if(sources[i].miners.length <= leastCount && source.energy > 0) {
                leastIndex = i;
                leastCount = sources[i].miners.length;
            }
        }
        this.memory.targetIndex = leastIndex;
        sources[leastIndex].miners.push(this.name);
        this.memory.target = sources[leastIndex].id;
        // console.log(this.name, 'selected harvest target', this.memory.targetIndex, this.memory.target);
    }
    // else {
    //     console.log(this.name, 'already has harvest target', this.memory.targetIndex, this.memory.target);
    // }
};

Creep.prototype.unregisterGathering = function() {
    var targetIndex = this.memory.targetIndex;
    if(targetIndex != undefined) {
        // console.log(this.name, 'unregistering from gathering');
        var source = this.room.memory.energySources[targetIndex];
        lodash.pull(source.miners, this.name);
        delete this.memory.targetIndex;
        delete this.memory.target;
    }
};

Creep.prototype.gatherEnergy = function(target) {
    //Harvesters will cheerfully keep harvesting even if they have no space, so we have to check.
    if(this.carry.energy < this.carryCapacity) {
        var result = this.harvest(target);
        if(result == ERR_NOT_ENOUGH_RESOURCES) {
            this.room.memory.noEnergy = true;
            //select new source?
        }
        else if(result == ERR_NOT_IN_RANGE || result == OK) {
            this.room.memory.noEnergy = false;
        }
        return result;
    }
    else {
        return ERR_FULL;
    }
}

Room.prototype.checkMiner = function() {
    let minerals = this.find(FIND_MINERALS);
    if(!minerals.length) {
        return;
    }
    let mineral = minerals[0];
    //Minerals aren't walkable, so if there's a structure on the mineral, it's an extractor.
    let extractors = this.lookForAt(LOOK_STRUCTURES, mineral);
    if(!extractors.length) {
        this.createConstructionSite(mineral, STRUCTURE_EXTRACTOR);
        return;
    }
    if(this.memory.miner && !(this.memory.miner in Game.creeps)) {
        delete this.memory.miner;
    }
    if(!this.memory.miner && mineral.mineralAmount > 0) {
        this.memory.needsMiner = true;
    }
}
