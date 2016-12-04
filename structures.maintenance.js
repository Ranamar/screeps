var analytics = require('analytics');

// 30 per 1000 is about how many part-steps are required for a road on plains to be worth maintaining.
// 150 per 1000 is about how many part-steps are required for a road on swamp to be worth maintaining.
// The math is the same as for building it except with 50 instead of 300 and 250 instead of 1500 for road costs.
var MIN_VALUABLE_ROAD_SCORE = 150;

// Structure.prototype.needsRepairsExt = function(percentDamaged, maxHits) {
//     var dynamicScore = true;
//     if(this.structureType == STRUCTURE_ROAD) {
//         dynamicScore = analytics.getWalkScore(this.pos) > 30;
//     }
//     return (this.hits < this.hitsMax*percentDamaged) && (this.hits < maxHits) && dynamicScore;
// };

Structure.prototype.needsRepairs = function() {
    var dynamicScore = true;
    if(this.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(this.pos) > MIN_VALUABLE_ROAD_SCORE;
    }
    return (this.hits < this.hitsMax*0.5) && (this.hits < 25000) && dynamicScore;
};

Creep.prototype.checkedRepair = function(repTarget) {
    // console.log(this.name, 'repairing', repTarget, repTarget.pos, repTarget.hits, repTarget.hitsMax);
    if(!(repTarget.needsRepairs())) {
        console.log(repTarget, "doesn't need repairs");
        //repair never returns this, so we can overload this return.
        return ERR_FULL;
    }
    var attempt = this.repair(repTarget);
    // console.log('repair attempt', attempt);
    return attempt;
}
