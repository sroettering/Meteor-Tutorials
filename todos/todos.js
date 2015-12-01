Router.configure({
  // options go here
  layoutTemplate: 'main',
  loadingTemplate: 'loading'
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
    var currentUser = Meteor.userId();
    return Lists.findOne({_id: currentList, createdBy: currentUser});
  },
  onBeforeAction: function() { // Hook function
    var currentUser = Meteor.userId();
    if(currentUser) {
      this.next();
    } else {
      this.render('login');
    }
  },
  waitOn: function() {
    var currentList = this.params._id
    return Meteor.subscribe('tasks', currentList);
  }
});

Todos = new Mongo.Collection('todos');
Lists = new Meteor.Collection('lists');

if (Meteor.isClient) {

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
      Meteor.call('insertTask', todoName, currentList, function(error) {
        if(error) {
          console.log(error.reason);
        } else {
            $('[name="todoName"]').val('');
        }
      });
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
      Meteor.call('createList', listName, function(error, results) {
        if(error) {
          console.log(error.reason);
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

  $.validator.setDefaults({
    rules: {
      email: {
        required: true,
        email: true
      },
      password: {
        required: true,
        minlength: 6
      }
    },
    messages: {
      email: {
        required: "You must enter an email address!",
        email: "You've entered an invalid email address!"
      },
      password: {
        required: "You must enter a password!",
        minlength: "Your password must be at least {0} characters!"
      }
    }
  });

  Template.register.onRendered(function() {
    var validator = $('.register').validate({
      submitHandler: function(event) {
        var email = $('[name=email]').val();
        var password = $('[name=password]').val();
        Accounts.createUser({
           email: email,
           password: password
        }, function(error) {
          if(error) {
            if(error.reason == "Email already exists.") {
              validator.showErrors({
                email: "That email is already in use!"
              });
            }
          } else {
            Router.go('home');
            $('[name=email]').val('');
          }
          $('[name=password]').val('');
        });
      }
    });
  });

  Template.register.events({
    'submit form': function(event) {
      event.preventDefault();
    }
  });

  Template.login.onRendered(function() {
    var validator = $('.login').validate({
      submitHandler: function(event) {
        var email = $('[name=email]').val();
        var password = $('[name=password]').val();
        Meteor.loginWithPassword(email, password, function(error) {
          if(error) {
            if(error.reason == "User not found") {
              validator.showErrors({
                email: error.reason
              });
            }
            if(error.reason == "Incorrect password") {
              validator.showErrors({
                password: error.reason
              });
            }
          } else {
            var currentRoute = Router.current().route.getName();
            if(currentRoute == 'login') {
              Router.go('home');
            }
          }
        });
      }
    });
  });

  Template.login.events({
    'submit form': function(event) {
      event.preventDefault();
    }
  });

}

if (Meteor.isServer) {
  Meteor.publish('tasks', function(currentList) {
    var currentUser = this.userId;
    return Todos.find({createdBy: currentUser, listId: currentList});
  });

  Meteor.publish('lists', function() {
    var currentUser = this.userId;
    return Lists.find({createdBy: currentUser});
  });

  Meteor.methods({
    'insertTask': function(todoName, currentList) {
      var currentUser = Meteor.userId();

      // Checking Values
      check(todoName, String);
      if(todoName == "") {
        todoName = defaultTaskName(currentUser);
      }

      if(!currentUser) {
        throw new Meteor.Error("not-logged-in", "You're not logged in!");
      }

      var currentList = Lists.findOne(currentList);
      if(currentList.createdBy != currentUser) {
        throw new Meteor.Error("invalid-user", "You don't own that list!");
      }

      return Todos.insert({
        name: todoName,
        completed: false,
        createdAt: new Date(),
        createdBy: currentUser,
        listId: currentList
      });
    },
    'deleteTask': function(task) {
      var currentUser = Meteor.userId();
      if(!currentUser) {
        throw new Meteor.Error("not-logged-in", "You're not logged in!");
      }
      Todos.remove({_id: task, createdBy: currentUser});
    },
    'updateTaskName': function(task, todoName) {
      var currentUser = Meteor.userId();

      // Checking Values
      check(todoName, String);
      if(todoName == "") {
        todoName = defaultTaskName(currentUser);
      }

      if(!currentUser) {
        throw new Meteor.Error("not-logged-in", "You're not logged in!");
      }

      Todos.update({_id: task, createdBy: currentUser}, {$set: {name: todoName}});
    },
    'completeTask': function(task, completeStatus) {
      var currentUser = Meteor.userId();
      if(!currentUser) {
        throw new Meteor.Error("not-logged-in", "You're not logged in!");
      }

      // Checking Values
      check(completeStatus, Boolean);

      Todos.update({_id: task, createdBy: currentUser}, {$set: {completed: completeStatus}});
    },
    'createList': function(listName) {
      var currentUser = Meteor.userId();

      // Checking Values
      check(listName, String);
      if(listName == "") {
        listName = defaultListName(currentUser);
      }

      if(!currentUser) {
        throw new Meteor.Error("not-logged-in", "You're not logged in!");
      }

      return Lists.insert({
        name: listName,
        createdBy: currentUser
      });
    }
  });

  function defaultTastName(currentUser) {
    var nextNumber = '1';
    var nextName = 'Task ' + nextNumber;
    while(Todos.findOne({name: nextName, createdBy: currentUser})) {
      nextNumber += 1;
      nextName = 'Task ' + nextNumber;
    }
    return nextName;
  }

  function defaultListName(currentUser) {
    var nextLetter = 'A';
    var nextName = 'List ' + nextLetter;
    while(Lists.findOne({name: nextName, createdBy: currentUser})) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
      nextName = 'List ' + nextLetter;
    }
    return nextName;
  }

}
