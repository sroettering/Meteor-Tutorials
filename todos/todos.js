Router.configure({
  // options go here
  layoutTemplate: 'main'
});
Router.route('/', {
  name: 'home',
  template: 'home'
});
Router.route('/register');
Router.route('/login');
Router.route('/list/:_id', {
  name: 'listPage',
  template: 'listPage',
  data: function() {
    var currentList = this.params._id;
    return Lists.findOne({_id: currentList});
  }
});

Todos = new Mongo.Collection('todos');
Lists = new Meteor.Collection('lists');

if (Meteor.isClient) {
  Meteor.subscribe('tasks');
  Meteor.subscribe('lists');

  Template.todos.helpers({
    'todo': function() {
      var currentList = this._id;
      var currentUser = Meteor.userId();
      return Todos.find({listId: currentList, createdBy: currentUser}, {sort: {createdAt: -1}});
    },
    'checked': function() {
      var isCompleted = this.completed;
      if(isCompleted) {
        return "checked";
      } else {
        return "";
      }
    }
  });

  Template.todosCount.helpers({
    // helpers go here
    'totalTodos': function() {
      var currentList = this._id;
      return Todos.find({listId: currentList}).count();
    },
    'completedTodos': function() {
      var currentList = this._id;
      return Todos.find({listId: currentList, completed: true}).count();
    }
  });

  Template.todos.events({
    'click .delete-todo': function(event) {
      event.preventDefault();
      var task = this._id;
      var confirm = window.confirm("Delete this task");
      if(confirm) Meteor.call('deleteTask', task);
    },
    'keyup [name=todoItem]': function(event) {
      var documentId = this._id;
      var todoItem = $(event.target).val();
      Meteor.call('updateTaskName', documentId, todoItem);
    },
    'change [type=checkbox]': function() {
      var documentId = this._id;
      var isCompleted = this.completed;
      if(isCompleted) {
        Meteor.call('completeTask', documentId, false);
      } else {
        Meteor.call('completeTask', documentId, true);
      }
    }
  });

  Template.addTodo.events({
    'submit form': function(event) {
      event.preventDefault();
      var todoName = $('[name="todoName"]').val();
      var currentList = this._id;
      var currentUser = Meteor.userId();
      Meteor.call('insertTask', todoName, currentList, currentUser);
      $('[name="todoName"]').val('');
    }
  });

  Template.lists.helpers({
    'list': function() {
      var currentUser = Meteor.userId();
      return Lists.find({createdBy: currentUser}, {sort: {name: 1}});
    }
  });

  Template.addList.events({
    'submit form': function(event) {
      event.preventDefault();
      var listName = $('[name=listName]').val();
      var currentUser = Meteor.userId();
      Meteor.call('createList', listName, currentUser, function(error, results) {
        if(error) {
          console.log(error);
        } else {
          Router.go('listPage', {_id: results});
          $('[name=listName]').val('');
        }
      });
    }
  });

  Template.navigation.events({
    'click .logout': function(event) {
      event.preventDefault();
      Meteor.logout();
      Router.go('login');
    }
  });

  Template.register.events({
    'submit form': function(event) {
      event.preventDefault();
      var email = $('[name=email]').val();
      var password = $('[name=password]').val();
      Accounts.createUser({
         email: email,
         password: password
      }, function(error) {
        if(error) {
          console.log(error.reason);
        } else {
          Router.go('home');
          $('[name=email]').val('');
        }
        $('[name=password]').val('');
      });
    }
  });

  Template.login.events({
    'submit form': function(event) {
      event.preventDefault();
      var email = $('[name=email]').val();
      var password = $('[name=password]').val();
      Meteor.loginWithPassword(email, password, function(error) {
        if(error) {
          console.log(error.reason);
        } else {
          Router.go('home');
        }
      });
    }
  });

}

if (Meteor.isServer) {
  Meteor.publish('tasks', function() {
    return Todos.find();
  });

  Meteor.publish('lists', function() {
    return Lists.find();
  });

  Meteor.methods({
    'insertTask': function(todoName, currentList, currentUser) {
      Todos.insert({
        name: todoName,
        completed: false,
        createdAt: new Date(),
        createdBy: currentUser,
        listId: currentList
      });
    },
    'deleteTask': function(task) {
      Todos.remove(task);
    },
    'updateTaskName': function(task, todoName) {
      Todos.update({_id: task}, {$set: {name: todoName}});
    },
    'completeTask': function(task, completeStatus) {
      if(completeStatus) {
        Todos.update({_id: task}, {$set: {completed: true}});
      } else {
        Todos.update({_id: task}, {$set: {completed: false}});
      }
    },
    'createList': function(listName, currentUser) {
      return Lists.insert({
        name: listName,
        createdBy: currentUser
      });
    }
  });
}
