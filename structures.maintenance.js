var analytics = require('analytics');

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
        // 30 per 1000 is about how many part-steps are required for a road on flatland to be worth maintaining.
        dynamicScore = analytics.getWalkScore(this.pos) > 30;
    }
    return (this.hits < this.hitsMax*0.5) && (this.hits < 25000) && dynamicScore;
};