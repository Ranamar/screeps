var lodash = require('lodash');

Creep.prototype.selectEnergySource = function() {
    var sources = this.room.memory.energySources;
    if(this.memory.targetIndex == undefined) {
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
    }
};

Creep.prototype.unregisterGathering = function() {
    var targetIndex = this.memory.targetIndex;
    if(targetIndex != undefined) {
        var source = this.room.memory.energySources[targetIndex];
        lodash.pull(source.miners, this.name);
        this.memory.targetIndex = undefined;
    }
};

Creep.prototype.gatherEnergy = function(target) {
    var result = this.harvest(target);
    if(result == ERR_NOT_ENOUGH_RESOURCES) {
        this.room.memory.noEnergy = true;
        //select new source
        // this.unregisterGathering();
        // target = this.selectSource();
    }
    else if(result == ERR_NOT_IN_RANGE || result == OK) {
        this.room.memory.noEnergy = false;
    }
    return result;
}

//Remove once we have the new move/work framework in place
module.exports.gatherEnergy = function(creep) {
    creep.selectEnergySource();
    var target = Game.getObjectById(creep.room.memory.energySources[creep.targetIndex]);
    var result = creep.gatherEnergy(target);
    if(result == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);
    }
    else if(result == ERR_NOT_ENOUGH_RESOURCES) {
        creep.room.memory.noEnergy = true;
        //reselect source
        creep.unregisterGathering();
        target = creep.selectEnergySource();
        //Go to wherever we happen to have picked.
        creep.moveTo(target);
    }
    else if(result == OK) {
        creep.room.memory.noEnergy = false;
    }
    return true;
};

//Remove once we have the new move/work framework in place
module.exports.pickupEnergy = function(creep) {
    var target = Game.getObjectById(creep.memory.target);
    if(target) {
        var result = creep.pickup(target);
        console.log('>>', creep.name, 'pickup result', result);
        if(result == ERR_NOT_IN_RANGE) {
            console.log('>>', creep.name, 'moving to pickup target', result);
            creep.moveTo(target);
        }
        else if(result == ERR_FULL || result == ERR_INVALID_TARGET) {
            console.log('>>', creep.name, 'gives up on pickup', result);
            //we can't do this; do something else
            return false;
        }
        return true;
    }
    else {
        console.log('>>', creep.name, 'pickup target disappeared');
        //energy disappeared!
        return false;
    }
};

