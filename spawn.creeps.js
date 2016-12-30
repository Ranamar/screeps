StructureSpawn.prototype.createScaledWorker = function(settings) {
    var energy = this.room.energyAvailable;
    var largest = [];
    if(energy >= 200) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    if(energy >= 400) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    //RCL 2 maxed out special case
    //At this point, we really want the extra work units to max out our sources.
    //Also, it's somewhat more efficient than the 400 with roads.
    if(energy >= 550) {
        largest = largest.concat([WORK, CARRY]);
    }
    //finish off the triad if we have more energy
    if(energy >= 600) {
        largest.push(MOVE);
    }
    //If we've got less than 850 energy, this beats 5/2/4.
    //RCL 3 gets us exactly 800 energy at the top end, so check for that case.
    if(energy == 800) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    if(energy >= 850) {
        largest = largest.concat([WORK, WORK, MOVE]);
    }
    if(energy >= 1000) {
        largest = largest.concat([CARRY, CARRY, MOVE]);
    }
    if(energy >= 1200) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    //If we truly have a ton of energy, double-stack 5/3/4.
    if(energy >= 1700) {
        largest = largest.concat([WORK, WORK, WORK, WORK, MOVE, MOVE]);
    }
    var result = this.createCreep(largest, null, settings);
    if(!(result < 0)) {
        Game.creeps[result].workerInit();
    }
    return result;
}

StructureSpawn.prototype.createSymmetricalWorker = function(settings) {
    var energy = this.room.energyAvailable;
    var block = [WORK, CARRY, MOVE];
    var blockCost = 200;
    var totalCost = 0;
    var largest = [];
    //We can't have more than 50 body parts on a creep.
    while(totalCost + blockCost <= energy && largest.length < 48) {
        largest = largest.concat(block);
        totalCost += blockCost;
    }
    var result = this.createCreep(largest, null, settings);
    if(!(result < 0)) {
        Game.creeps[result].workerInit();
    }
    return result
}

StructureSpawn.prototype.createDedicatedUpgrader = function(settings) {
    //We'll create a more nuanced thing later, once I get a better handle on what I can do with this.
    //To save a little on eventually useless parts, this moves at half speed even on roads.
    let result = this.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, /*WORK, WORK, WORK, WORK,*/ CARRY, MOVE, MOVE, MOVE], null, settings);
    if(!(result < 0)) {
        Game.creeps[result].workerInit();
    }
    return result
}

StructureSpawn.prototype.createHarvester = function() {
    let result = this.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE], null, {role:'harvester'});
    if(!(result < 0)) {
        Game.creeps[result].workerInit();
    }
    return result
}
