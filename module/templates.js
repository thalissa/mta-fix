import { MTA } from "./config.js";
/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  // Define template paths to load
  const templatePaths = [
    // Actor Sheet Partials
    "systems/mta/templates/actors/parts/base-attributes.hbs",
    "systems/mta/templates/actors/parts/base-inventory.hbs",
    "systems/mta/templates/actors/parts/vamp-disciplines.hbs",
    "systems/mta/templates/actors/parts/mage-magic.hbs",
    "systems/mta/templates/actors/parts/changeling-powers.hbs",
    "systems/mta/templates/actors/parts/werewolf-gifts.hbs",
    "systems/mta/templates/actors/parts/demon-embeds.hbs",
    "systems/mta/templates/actors/parts/hunter-endowments.hbs"
  ];

  // Load the template parts
  return loadTemplates(templatePaths);
};

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper('isMagCol', function (value) {
    return value === 3;
  });
  Handlebars.registerHelper('eqAny', function () {
    for(let i = 1; i < arguments.length; i++) {
      if(arguments[0] === arguments[i]) {
        return true;
      }
    }
    return false;
  });
  Handlebars.registerHelper('scelestiRankHigherThan', function (value, rank) {
    return MTA.scelestiRanks.indexOf(value) >= MTA.scelestiRanks.indexOf(rank);
  });
  Handlebars.registerHelper('convertVampTouchstone', function (value) {
    let newValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    return newValues[value - 1];
  });

  Handlebars.registerHelper('isActiveVampTouchstone', function (value, integrity) {
    let newValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    let newValue = newValues[value - 1];
    return newValue <= integrity;
  });

  Handlebars.registerHelper('isActiveTouchstoneChangeling', function (value, composure) {
    return value >= composure + 1;
  });

  Handlebars.registerHelper('convertBool', function (value) {
    return value === true ? "Yes" : "No";
  });

  Handlebars.registerHelper('isGoblinContract', function (value) {
    return value === "Goblin";
  });

  Handlebars.registerHelper('breaklines', function (text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.replace(/(\n)/gm, '<br>');
    return new Handlebars.SafeString(text);
  });

  Handlebars.registerHelper('addPlus', function (value) {
    return value >= 0 ? "+" + value : value;
  });

  Handlebars.registerHelper('posneg', function (value, comp) {
    return value >= comp ? "positive" : "negative";
  });

  Handlebars.registerHelper('posnegTwoVal', function (value, value2, comp) {
    return (value >= comp && value2 >= comp) ? "positive" : "negative";
  });

  Handlebars.registerHelper('addBrackets', function (value) {
    return Number.isInteger(value) ? "(" + value + ")" : "";
  });

  Handlebars.registerHelper('chooseNum', function (value1, value2) {
    return Number.isInteger(value1) ? value1 : Number.isInteger(value2) ? value2 : 0;
  });

  Handlebars.registerHelper('isInteger', function (value) {
    return Number.isInteger(value);
  });

  Handlebars.registerHelper('scaleIndex', function (value) {
    let scaleIndex = CONFIG.MTA.spell_casting.scale.standard.findIndex(v => (v === value));
    if (scaleIndex < 0) scaleIndex = CONFIG.MTA.spell_casting.scale.advanced.findIndex(v => (v === value));
    if (scaleIndex < 0) scaleIndex = 0
    else scaleIndex++;
    return scaleIndex;
  });

  Handlebars.registerHelper('translate', function (value) { //Unused?
    if (CONFIG.MTA.attributes_physical[value]) return CONFIG.MTA.attributes_physical[value];
    else if (CONFIG.MTA.attributes_social[value]) return CONFIG.MTA.attributes_social[value];
    else if (CONFIG.MTA.attributes_mental[value]) return CONFIG.MTA.attributes_mental[value];
    else if (CONFIG.MTA.skills_physical[value]) return CONFIG.MTA.skills_physical[value];
    else if (CONFIG.MTA.skills_social[value]) return CONFIG.MTA.skills_social[value];
    else if (CONFIG.MTA.skills_mental[value]) return CONFIG.MTA.skills_mental[value];
    else if (CONFIG.MTA.derivedTraits[value]) return CONFIG.MTA.derivedTraits[value];
    else if (CONFIG.MTA.arcana[value]) return CONFIG.MTA.arcana[value];
    else if (CONFIG.MTA.hunter_traits[value]) return CONFIG.MTA.hunter_traits[value];
    else return "ERROR";
  });

  Handlebars.registerHelper('getMagicalColor', function (magicType, magicClass) {
    if(CONFIG.MTA.magicItemColors[magicClass]) return CONFIG.MTA.magicItemColors[magicClass];
    else if(CONFIG.MTA.magicItemColors[magicType]) return CONFIG.MTA.magicItemColors[magicType];
    else return CONFIG.MTA.magicItemColors.Default;
  });

  Handlebars.registerHelper('translateTrait', function (value) {
    return value.split('.').reduce((o,i)=> o[i], CONFIG.MTA);
  });

  Handlebars.registerHelper('isArcadian', function (value) {
    return value === "Arcadian";
  });

  Handlebars.registerHelper('isCourt', function (value) {
    return value === "Court";
  });

  Handlebars.registerHelper('isGoblin', function (value) {
    return value === "Goblin";
  });

  Handlebars.registerHelper('usesJoining', function (characterType, scelestiRank) {
    return characterType === "Scelesti" && MTA.scelestiRanks.indexOf(scelestiRank) >= MTA.scelestiRanks.indexOf("Nasnas");
  });

  // Return enriched text WITH secret blocks if the user is GM and otherwise WITHOUT
  Handlebars.registerHelper("enrichHTML", function(value, object) {
    let secrets = false;
    if (object) secrets = object.isOwner;
    if (game.user.isGM) secrets = true;
    //enrichHTML(content, secrets, entities, links, rolls, rollData) → {string}
    return TextEditor.enrichHTML(value, {secrets:secrets, entities:true, async: false});
  })
}