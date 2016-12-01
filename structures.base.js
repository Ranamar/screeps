/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('structures.base');
 * mod.thing == 'a thing'; // true
 */

var analytics = require('analytics');

Structure.prototype.needsRepairsExt = function(percentDamaged, maxHits) {
    var dynamicScore = true;
    if(this.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(this.pos) > 0;
    }
    return (this.hits < this.hitsMax*percentDamaged) && (this.hits < maxHits) && dynamicScore;
};

Structure.prototype.needsRepairs = function() {
    var dynamicScore = true;
    if(this.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(this.pos) > 0;
    }
    return (this.hits < this.hitsMax*0.5) && (this.hits < 25000) && dynamicScore;
};