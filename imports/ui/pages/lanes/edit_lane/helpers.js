import { Template } from 'meteor/templating';
import { Lanes } from '../../../../api/lanes';
import { Session } from 'meteor/session';
import { Users } from '../../../../api/users';
import { Harbors } from '../../../../api/harbors';
import { count, history, get_lane } from '../lib/util';
import { moment } from 'meteor/momentjs:moment';

const options = { sort: { actual: -1 }, limit: H.AMOUNT_SHOWN };

Template.edit_lane.onCreated(function () {
  const name = FlowRouter.getParam('name');
  const lane = get_lane(name);

  if (lane) this.subscribe('Shipments', lane, options);
});

Template.edit_lane.helpers({
  lane_name () {
    var name = FlowRouter.getParam('name');
    var lane = get_lane(name) ||
      Session.get('lane') ||
      {}
    ;

    lane.name = lane.name || 'New';

    Session.set('lane', lane);

    return lane.name == 'New' ? '' : lane.name;
  },

  slug () {
    const lane = get_lane(FlowRouter.getParam('name'));
    const a = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;';
    const b = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------';
    const p = new RegExp(a.split('').join('|'), 'g');

    if (lane) {
      const slug = lane.name.toLowerCase()
      // https://gist.github.com/matthagemann/382adfc57adbd5af078dc93feef01fe1
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
      ;

      lane.slug = slug;
      H.call('Lanes#update_slug', lane, (err, res) => {
        if (err) throw err;
        console.log(`Lane slug ${lane.slug} updated: ${res}`);
      });

      return `${window.location.host}/lanes/${slug}/ship`;
    }

    return '';
  },

  followup_lane () {
    let lane = get_lane(FlowRouter.getParam('name'));
    let followup_lane = Lanes.findOne(lane.followup);

    if (followup_lane) return followup_lane.name;

    return '';
  },

  lanes () {
    return Lanes.find({}, { sort: { name: 1 } });
  },

  lane () {
    let lane = get_lane(FlowRouter.getParam('name'));

    return lane;
  },

  count () {
    return count(get_lane(FlowRouter.getParam('name')));
  },

  history () {
    return history(get_lane(FlowRouter.getParam('name')));
  },

  shipping_log_amount_shown () {
    return H.AMOUNT_SHOWN;
  },

  validate_done () {
    if (! Session.get('lane') || ! Session.get('lane').minimum_complete) {
      return true;
    }

    return false;
  },

  no_followup () {
    let lane = get_lane(FlowRouter.getParam('name'));

    if (
      Lanes.find().fetch().length < 2 ||
      (lane && lane.followup) ||
      Session.get('choose_followup')
    ) return true;

    return false;
  },

  no_salvage () {
    let lane = get_lane(FlowRouter.getParam('name'));

    if (
      Lanes.find().fetch().length < 2 ||
      (lane && lane.salvage_plan) ||
      Session.get('choose_salvage_plan')
    ) return true;

    return false;
  },

  choose_followup () {
    let lane = get_lane(FlowRouter.getParam('name'));

    return Session.get('choose_followup') || lane && lane.followup;
  },

  choose_salvage_plan () {
    let lane = get_lane(FlowRouter.getParam('name'));

    return Session.get('choose_salvage_plan') || lane && lane.salvage_plan;
  },

  chosen_followup () {
    let lane = get_lane(FlowRouter.getParam('name'));

    return this._id == lane.followup;
  },

  chosen_salvage_plan () {
    let lane = get_lane(FlowRouter.getParam('name'));

    return this._id == lane.salvage_plan;
  },

  captain_list () {
    var users = Users.find().fetch();

    return users;
  },

  can_ply () {
    var lane = Session.get('lane') || {};

    if (this.harbormaster) { return true; }

    if (lane.captains && lane.captains.length) {
      let user = this._id;

      return _.find(lane.captains, function (captain) {
        return user == captain;
      }) ?
        true :
        false
      ;
    }

    return false;
  },

  plying () {
    var lane = Session.get('lane');
    var user = Users.findOne(Meteor.user().emails[0].address);

    if (user && user.harbormaster) { return true; }

    if (lane.captains && lane.captains.length) {
      let captain = _.find(lane.captains, function (email) {
        return email == Meteor.user().emails[0].address;
      });

      return captain ? true : false;
    }

    return false;
  },

  can_set_ply () {
    var user = Users.findOne(Meteor.user().emails[0].address);

    if (this.harbormaster) { return true; }

    if (user) { return ! user.harbormaster; }

    return false;
  },

  pretty_date (date) {
    return new Date(date).toLocaleString();
  },

  duration () {
    return moment.duration(this.finished - this.actual).humanize();
  },

  harbors () {
    let harbors = Harbors.find().fetch();

    return harbors;
  },

  choose_type () {
    return Session.get('choose_type');
  },

  current_lane () {
    let name = FlowRouter.getParam('name');
    let lane = Session.get('lane') || get_lane(name);

    return lane;
  },

  lane_type () {
    let name = FlowRouter.getParam('name');
    let lane = Session.get('lane') || get_lane(name);

    return lane.type;
  },

  render_harbor () {
    let name = FlowRouter.getParam('name');
    let lane = Session.get('lane') || get_lane(name);

    let harbor = Harbors.findOne(lane.type) || {};
    let harbor_lane_reference = harbor.lanes ? harbor.lanes[lane._id] : false;
    let manifest = harbor_lane_reference ?
      harbor_lane_reference.manifest :
      false
    ;

    Meteor.call(
      'Harbors#render_input',
      lane,
      manifest,
      function (err, active_lane) {
        if (err) throw err;

        Session.set('lane', active_lane);
    });

    if (lane.rendered_input) return lane.rendered_input;

    return harbor.rendered_input;
  },

  validating_fields () {
    return Session.get('validating_fields');
  },

});

