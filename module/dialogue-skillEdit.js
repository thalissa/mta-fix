export class SkillEditDialogue extends Application {
  constructor(actor, skill_key, skill_type,...args) {
    super(...args);
    this.actor = actor;
    this.skill_key = skill_key;
    this.skill_type = skill_type;
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["worldbuilding", "dialogue", "mta-sheet"],
  	  template: "systems/mta/templates/dialogues/dialogue-skillEdit.html",
      resizable: true,
      width: 260,
      height: 250,
      title: "Specialties"
    });
  }
  
  getData() {
    const data = super.getData();
    data.specialties = this.actor.system["skills_" + this.skill_type][this.skill_key].specialties;
    data.isAssetSkill = this.actor.system["skills_" + this.skill_type][this.skill_key].isAssetSkill;
    
    return data;
  }
  

  activateListeners(html) {
    super.activateListeners(html);
    
    
    html.find('.add-specialty').click(ev => this._onAddSpecialty(ev));
    html.find('.remove-specialty').click(ev => this._onRemoveSpecialty(ev));
    html.find('input').change(ev => this._onChangeSpecialty(ev));
    html.find('.toggle-asset').click(ev => this._onToggleAsset(ev));
  }

  async _onAddSpecialty(event) {
    let skills = duplicate(this.actor.system["skills_" + this.skill_type]);

    if(!skills[this.skill_key].specialties) skills[this.skill_key].specialties = [];
    skills[this.skill_key].specialties.push("New Specialty");

    let updateData = {}
    updateData['system.skills_' + this.skill_type] = skills;
    await this.actor.update(updateData)
    this.render();
  }
  
  async _onRemoveSpecialty(event) {
    let skills = duplicate(this.actor.system["skills_" + this.skill_type]);
    const specialty_index = event.currentTarget.dataset.index;

    if(!skills[this.skill_key].specialties) skills[this.skill_key].specialties = [];
    skills[this.skill_key].specialties.splice(specialty_index, 1);

    let updateData = {}
    updateData['system.skills_' + this.skill_type] = skills;
    await this.actor.update(updateData)
    this.render();
  }
  
  async _onChangeSpecialty(event) {
    const specialty_index = event.currentTarget.dataset.index;
    const specialty_value = event.currentTarget.value;
    let skills = duplicate(this.actor.system["skills_" + this.skill_type]);
    skills[this.skill_key].specialties[specialty_index] = specialty_value;
    
    let updateData = {}
    updateData['system.skills_' + this.skill_type] = skills;
    await this.actor.update(updateData)
    this.render();
  }
  
   async _onToggleAsset(event) {
    let skills = duplicate(this.actor.system["skills_" + this.skill_type]);
    skills[this.skill_key].isAssetSkill = !skills[this.skill_key].isAssetSkill;
    
    let updateData = {}
    updateData['system.skills_' + this.skill_type] = skills;
    await this.actor.update(updateData)
    this.render();
  }

}