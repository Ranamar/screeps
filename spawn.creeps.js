StructureSpawn.prototype.createScaledWorker = function(settings) {
    var energy = this.room.energyAvailable;
    var largest = [];
    if(energy >= 200) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    if(energy >= 400) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    if(energy >= 600) {
        largest = largest.concat([WORK, CARRY, MOVE]);
    }
    if(energy >= 850) {
        largest = largest.concat([WORK, WORK, MOVE]);
    }
    //If we truly have a ton of energy, double-stack it.
    if(energy >= 1700) {
        largest = largest.concat([WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]);
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
    while(totalCost + blockCost <= energy) {
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
    let result = this.createCreep([WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE], null, settings);
    if(!(result < 0)) {
        Game.creeps[result].workerInit();
    }
    return result
}