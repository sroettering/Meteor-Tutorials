PlayersList = new Mongo.Collection('players');

if(Meteor.isClient) {
  // this code only runs on the client
  Meteor.subscribe('thePlayers');

  //       Templatename
  Template.leaderboard.helpers({
    'player': function() {
      return PlayersList.find({}, {sort: {score: -1, name: 1}});
    },
    'selectedClass': function() {
      var playerId = this._id;
      var selectedPlayer = Session.get('selectedPlayer');
      if(playerId == selectedPlayer) {
        return "selected";
      }
    },
    'showSelectedPlayer': function() {
      var selectedPlayer = Session.get('selectedPlayer');
      return PlayersList.findOne(selectedPlayer);
    }
  });

  Template.leaderboard.events({
    'click .player': function() {
      var playerId = this._id;
      Session.set('selectedPlayer', playerId);
    },
    'click .increment': function() {
      var selectedPlayer = Session.get('selectedPlayer');
      Meteor.call('modifyPlayerScore', selectedPlayer, 5);
    },
    'click .decrement': function() {
      var selectedPlayer = Session.get('selectedPlayer');
      Meteor.call('modifyPlayerScore', selectedPlayer, -5);
    },
    'click .removePlayer': function() {
      var selectedPlayer = Session.get('selectedPlayer');
      Meteor.call('removePlayerData', selectedPlayer);
    }
  });

  Template.addPlayerForm.events({
    'submit form': function(event) {
      event.preventDefault();
      var playerName = event.target.playerName.value;
      Meteor.call('insertPlayerData', playerName);
      event.target.playerName.value = "";
    }
  });

}



if(Meteor.isServer) {
  // this code only runs on the server
  Meteor.publish('thePlayers', function() {
    var currentUserId = this.userId;
    return PlayersList.find({createdBy: currentUserId});
  });

  Meteor.methods({
    'insertPlayerData': function(playerName) {
      var currentUserId = Meteor.userId();
      PlayersList.insert({
        name: playerName,
        score: 0,
        createdBy: currentUserId
      });
    },
    'removePlayerData': function(selectedPlayer) {
      var currentUserId = Meteor.userId();
      PlayersList.remove({_id: selectedPlayer, createdBy: currentUserId});
    },
    'modifyPlayerScore': function(selectedPlayer, scoreValue) {
      var currentUserId = Meteor.userId();
      PlayersList.update({_id: selectedPlayer, createdBy: currentUserId}, {$inc: {score: scoreValue}});
    }
  });
}
