var analytics = require('analytics');

// 30 per 1000 is about how many part-steps are required for a road on plains to be worth maintaining.
// 150 per 1000 is about how many part-steps are required for a road on swamp to be worth maintaining.
// The math is the same as for building it except with 50 instead of 300 and 250 instead of 1500 for road costs.
var MIN_VALUABLE_ROAD_SCORE = 150;

var WALL_TARGET_STRENGTH = 25000;

// Structure.prototype.needsRepairsExt = function(percentDamaged, maxHits) {
//     var dynamicScore = true;
//     if(this.structureType == STRUCTURE_ROAD) {
//         dynamicScore = analytics.getWalkScore(this.pos) > 30;
//     }
//     return (this.hits < this.hitsMax*percentDamaged) && (this.hits < maxHits) && dynamicScore;
// };

Structure.prototype.needsEnergy = function() {
    return (this.structureType == STRUCTURE_EXTENSION ||
            this.structureType == STRUCTURE_SPAWN ||
            this.structureType == STRUCTURE_LINK ||
            this.structureType == STRUCTURE_TOWER)
            && this.energy < this.energyCapacity;
}

Structure.prototype.needsRepairs = function() {
    return (this.hits < this.hitsMax*0.5) && (this.hits < WALL_TARGET_STRENGTH);
};

StructureRoad.prototype.needsRepairs = function() {
    var dynamicScore = true;
    if(this.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(this.pos) > MIN_VALUABLE_ROAD_SCORE;
    }
    return (this.hits < this.hitsMax*0.5) && (this.hits < WALL_TARGET_STRENGTH) && dynamicScore;
};

Structure.prototype.needsMaintenance = function() {
    return (this.hits < this.hitsMax*0.8) && (this.hits < WALL_TARGET_STRENGTH);
};

StructureRoad.prototype.needsMaintenance = function() {
    var dynamicScore = true;
    dynamicScore = analytics.getWalkScore(this.pos) > MIN_VALUABLE_ROAD_SCORE;
    return (this.hits < this.hitsMax*0.8) && (this.hits < WALL_TARGET_STRENGTH) && dynamicScore;
};

Creep.prototype.checkedRepair = function(repTarget) {
    if(!(repTarget instanceof Structure)) {
        console.log('got invalid repair target', repTarget);
        return ERR_INVALID_TARGET;
    }
    // console.log(this.name, 'repairing', repTarget, repTarget.pos, repTarget.hits, repTarget.hitsMax);
    if(!(repTarget.needsMaintenance())) {
        // console.log(repTarget, "doesn't need repairs");
        //repair never returns this, so we can overload this return value.
        return ERR_FULL;
    }
    var attempt = this.repair(repTarget);
    // console.log('repair attempt', attempt);
    return attempt;
}
