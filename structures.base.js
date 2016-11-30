/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('structures.base');
 * mod.thing == 'a thing'; // true
 */

var analytics = require('analytics');

Structure.prototype.needsRepairs = function(structure, percentDamaged = 0.5, maxHits = 25000) {
    var dynamicScore = true;
    if(structure.structureType == STRUCTURE_ROAD) {
        dynamicScore = analytics.getWalkScore(structure.pos) > 0;
    }
    return (structure.hits < structure.hitsMax*percentDamaged) && (structure.hits < maxHits) && dynamicScore;
};