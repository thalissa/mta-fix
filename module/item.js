import {
  DiceRollerDialogue
} from "./dialogue-diceRoller.js";
import {
  ActorMtA
} from "./actor.js";
/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemMtA extends Item {
  
  /* -------------------------------------------- */
  /*	Data Preparation														*/
  /* -------------------------------------------- */

  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData(); //TODO: Put this functionality in where the item is initialised to avoid problems. Alternative: isImgInitialised flag
    if (!this.img || this.img === "icons/svg/item-bag.svg" || this.img.startsWith('systems/mta/icons/placeholders')){
    
      let img = 'systems/mta/icons/placeholders/item-placeholder.svg';
      let type = this.type;
      if(type === "melee"){
        if(this.system.weaponType === "Unarmed") type = "unarmed";
        else if(this.system.weaponType === "Thrown") type = "thrown";
      }
      else if(type === "tilt"){
        if(this.system.isEnvironmental) type = "environmental";
      }
      else if(this.type === "rite"){
        if(this.system.riteType !== "Rite") type = "miracle";
      }
      else if(this.type === "spell" || this.type === "attainment" || this.type === "activeSpell"){
        type = this.system.arcanum;
      }
      else if(this.type === "facet"){
        if(this.system.giftType === "moon") type = "moonGift";
        else if(this.system.giftType === "shadow") type = "shadowGift";
        else if(this.system.giftType === "wolf") type = "wolfGift";
      }
      else if(this.type === "werewolf_rite"){
        if(this.system.riteType === "Wolf Rite") type = "werewolf_rite";
        else  type = "pack_rite";
      }
      else if(this.type === "demonPower"){
        if(this.system.lore) type = this.system.lore;
      }
      
      img = CONFIG.MTA.placeholders.get(type);
      if(!img) img = 'systems/mta/icons/placeholders/item-placeholder.svg';

      this.img = img; 
    }
  }

  /* -------------------------------------------- */

  /**
   * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
   * @return {Promise}
   */
  async roll(target) {
    //TODO: put skill roll mechanics into actor class

    const targets = game.user.targets;
    if(!target) target = targets ? targets.values().next().value : undefined;
      
     // Basic template rendering data
    const token = this.actor.token;
    const templateData = {
      item: this,
      actor: this.actor,
      tokenId: token ? `${token.object.scene.id}.${token.id}` : null, //token ? `${token.scene.id}.${token.id}` : null,
      isSpell: this.type === "spell",
      data: await this.getChatData()
    };

    // Render the chat card template
    const template = `systems/mta/templates/chat/item-card.html`;
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData = {
      user: game.user.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: ChatMessage.getSpeaker({actor: this.actor, token: this.actor.token}),
      flavor: ""
    };
    
    const actorData = this.actor.system;
    
    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;
    
    //Get dice pool
    let dicePool = 0;
    let flavor = "";
    let rollDice = false;
    let damageRoll = false;
    let penalty = 0;
    let extended = false;
    let target_successes = 0;
    
    if(this.system.dicePool && (this.system.dicePool?.attributes?.length > 0 || this.system.dicePool.value) ){
      rollDice = true;

      if(this.type === "firearm" || this.type === "melee") damageRoll = true;

      // Get dice pool according to the item's dice pool attribtues from the actor
      let dpA = this.system.dicePool.attributes ? this.system.dicePool.attributes.reduce((acc, cur) => {
        
        let ret = 0;
        let flv = "";
        try {
          ret = cur.split('.').reduce((o,i)=> o[i], actorData);
        }
        catch(e) { // FIXME: Check only for TypeError: Cannot read properties of undefined
          ui.notifications.error(`CofD: A roll attribute could not be resolved: ${cur}`);
          console.warn("CofD: A roll attribute could not be resolved. " + cur);
        }
        if(!Number.isInteger(ret)) {
          if(typeof ret.final == 'number') ret = ret.final;
          else if(typeof ret.value == 'number') ret = ret.value;
          else {
            ret = 0;
            ui.notifications.error(`CofD: A roll attribute could not be resolved: ${cur}`);
            console.warn("CofD: A roll attribute could not be resolved. " + cur);
          }
        }
        if(cur.split('.')[0] === "disciplines_own") flv = cur.split('.').reduce((o,i)=> o[i], actorData).label;
        else flv = cur.split('.').reduce((o,i)=> o[i], CONFIG.MTA);

        if(!flv) {
          ret = 0;
          ui.notifications.warn("The trait " + cur + " does not exist");
        }

        // Apply penalty if character has 0 in a skill
        const skillType = cur.split('.')[0];
        if((skillType === "skills_physical" || skillType === "skills_social") && ret <= 0){
          flv += " (unskilled)";
          ret -= 1;
        } else if(skillType === "skills_mental" && ret <= 0){
          flv += " (unskilled)";
          ret -= 3;
        }

        if(flavor) flavor += " + " + flv;
        else flavor = flv;
        return acc + ret;
      }, 0) : 0;
      dicePool += dpA;
      if(this.system.dicePool.value){
        dicePool += this.system.dicePool.value;
        if(flavor) flavor += " + " + this.system.dicePool.value;
        else flavor = "" + this.system.dicePool.value;
      }
      if(this.system.dicePool.extended) {
        extended = true;
        if(this.system.dicePool.target_successes) target_successes = this.system.dicePool.target_successes;
      }
    }
    else if(this.type === "firearm") { // Firearm
      rollDice = true;
      damageRoll = true;
      dicePool = actorData.attributes_physical.dexterity.final + actorData.skills_physical.firearms.final;
      flavor = "Dexterity + Firearms";
      if(actorData.skills_physical.firearms.final <= 0){
        dicePool -= 1;
        flavor += " (unskilled)";
      }
    }
    else if(this.type === "melee") { // Melee
      rollDice = true;
      damageRoll = true;
      
      if(this.system.weaponType === "Unarmed") { // Melee - Unarmed
        dicePool = actorData.attributes_physical.strength.final + actorData.skills_physical.brawl.final;
        flavor = "Strength + Brawl";
        if(actorData.skills_physical.brawl.final <= 0){
          dicePool -= 1;
          flavor += " (unskilled)";
        }
      }
      else if(this.system.weaponType === "Thrown") { // Melee - Thrown
        dicePool = actorData.attributes_physical.dexterity.final + actorData.skills_physical.athletics.final;
        flavor = "Dexterity + Athletics";
        if(actorData.skills_physical.athletics.final <= 0){
          dicePool -= 1;
          flavor += " (unskilled)";
        }
      }
      else { // Melee - Weaponry
        rollDice = true;
        damageRoll = true;
        dicePool = actorData.attributes_physical.strength.final + actorData.skills_physical.weaponry.final;
        flavor = "Strength + Weaponry";
        if(actorData.skills_physical.weaponry.final <= 0){
          dicePool -= 1;
          flavor += " (unskilled)";
        }
      }
    }
    else if(this.type === "influence") {
      dicePool = actorData.eph_physical.power.value + actorData.eph_social.finesse.value;
      flavor = "Power + Finesse";
    }
    else if(this.type === "manifestation") {
      dicePool = actorData.eph_physical.power.value + actorData.eph_social.finesse.value;
      flavor = "Power + Finesse";
    }
    else if(this.type === "vehicle") {
      rollDice = true;
      dicePool = actorData.attributes_physical.dexterity.final + actorData.skills_physical.drive.final;
      flavor = "Dexterity + Drive";
      if(actorData.skills_physical.drive.final <= 0){
        dicePool -= 1;
        flavor += " (unskilled)";
      }
    }
    if(this.system.diceBonus) {
      dicePool += this.system.diceBonus;
      flavor += this.system.diceBonus >= 0 ? ' (+' : ' ('; 
      flavor += this.system.diceBonus + ' equipment bonus)';
    }
    if(rollDice || (dicePool > 0) || (this.type === "equipment") || (this.type === "service")){
      if(this.system.isWeapon) damageRoll = true; // E.g. demon form abilities

      if(damageRoll) {
        if(this.type === "melee") {
          if(target?.actor?.system.derivedTraits) { // Remove target defense
            const def = target.actor.system.derivedTraits.defense;
            penalty = -(def.final ? def.final : def.value);
            penalty = penalty + -(target.actor.system.disciplines_common.celerity.value);
          }
        }

        if(this.type === "firearm") {
          if(target?.actor?.system.derivedTraits) { // Remove target defense
            penalty = -(target.actor.system.disciplines_common.celerity.value);
          }
        }

        if(target) {
          flavor += " vs target " + target.name + " [Defense: " + penalty + "]";
        }
      }

      let woundPenalty = this.actor.getWoundPenalties();
      
      if(woundPenalty > 0) {
        dicePool -= woundPenalty;
        flavor += " [Wound penalties: -" + woundPenalty + "]";
      }
      
      let title = "";
      title = this.name + " - " + flavor;

      let diceRoller = new DiceRollerDialogue({dicePool: dicePool, extended: extended, target_successes: target_successes, penalty: penalty, flavor: flavor, addBonusFlavor: true, title: title, damageRoll: damageRoll, itemName: this.name, itemImg: this.img, itemDescr: this.system.description, itemRef: this, weaponDamage: this.system.damage, armorPiercing: this.system.penetration, spendAmmo: this.type === "firearm", actorOverride: this.actor});
      diceRoller.render(true);
    }
    // Create the chat message
    return ChatMessage.create(chatData);
  }
  
  
  
  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log
   * @return {Object}               An object of chat data to render
   */
  async getChatData() {
    let secrets = this.isOwner;
    if (game.user.isGM) secrets = true;
    //enrichHTML(content, secrets, entities, links, rolls, rollData) → {string}

    const data = {
      description: TextEditor.enrichHTML(this.system.description, {secrets:secrets, entities:true, async: false})
    }

    console.log("DATA", data)
    return data;
  }
  
  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  static chatListeners(html) {
    html.on('click', '.button', this._onChatCardAction.bind(this));
    html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
  }
  
  /* -------------------------------------------- */

  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
  static async _onChatCardAction(event) {
    event.preventDefault();
      
    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;

    const card = button.closest(".chat-card");
    if(!card) return;
    const messageId = card.closest(".message").dataset.messageId;
    const message =  game.messages.get(messageId);
    const action = button.dataset.action;
    
    if(action === "addActiveSpell"){
      // Validate permission to proceed with the roll
      if ( !( game.user.isGM || message.isAuthor ) ) return;

      // Get the Actor from a synthetic Token
      const actor = this._getChatCardActor(card);
      if ( !actor ) return;
      
      //Get spell data
      let description = $(card).find(".card-description");
      description = description[0].innerHTML;
      
      let spellName = $(card).find(".item-name");
      spellName = spellName[0].innerText;
      
      //let image = $(card).find(".item-img");
      //image = image[0].src;
      let image = card.dataset.img;

      let spellFactorsArray = $(card).find(".spell-factors > li");
      spellFactorsArray = $.makeArray(spellFactorsArray);
      spellFactorsArray = spellFactorsArray.map(ele => {
        let text = ele.innerText;
        let advanced = ele.dataset.advanced === "true";
        let splitText = text.split(":",2);
        
        return [splitText[0], splitText[1], advanced];
      });
      let spellFactors = {};
      for(let i = 0; i < spellFactorsArray.length; i++){
        spellFactors[spellFactorsArray[i][0]] = {value: spellFactorsArray[i][1].trim(), isAdvanced: spellFactorsArray[i][2]};
      }
      
      //Special handling for conditional duration, and advanced potency
      let durationSplit = spellFactors.Duration.value.split("(",2);
      spellFactors.Duration.value = durationSplit[0];
      if(durationSplit[1]) spellFactors.Duration.condition = durationSplit[1].split(")",1)[0];
      spellFactors.Potency.value = spellFactors.Potency.value.split("(",1)[0].trim();
      
      const spellData = {
        name: spellName,
        img: image,
        system: {
          potency: spellFactors.Potency,
          duration: spellFactors.Duration,
          scale: spellFactors.Scale,
          arcanum: card.dataset.arcanum, 
          level: card.dataset.level, 
          practice: card.dataset.practice, 
          primaryFactor: card.dataset.primfactor, 
          withstand: card.dataset.withstand,
          description: description
        }
      };
      
      //Add spell to active spells
      const activeSpellData = mergeObject(spellData, {type: "activeSpell"},{insertKeys: true,overwrite: true,inplace: false,enforceTypes: true});
      await actor.createEmbeddedDocuments("Item", [activeSpellData]);
      ui.notifications.info("Spell added to active spells of " + actor.name);
    }
    
    // Re-enable the button
    button.disabled = false;
  }
  
  /* -------------------------------------------- */

  /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @return {Actor|null}         The Actor entity or null
   * @private
   */
  static _getChatCardActor(card) {

    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split(".");
      const scene = game.scenes.get(sceneId);
      if (!scene) return null;
      const tokenData = scene.getEmbeddedEntity("Token", tokenId);
      if (!tokenData) return null;
      const token = new Token(tokenData);
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }
  
  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-description");
    content.style.display = content.style.display === "none" ? "block" : "none";
  }
}
