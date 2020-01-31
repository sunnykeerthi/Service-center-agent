// This is template files for developing Alexa skills

'use strict';

var AWS = require('aws-sdk');
var jsforce = require('jsforce');
var intentHandlers = {};
const restServices = require('./restServices');
const util = require('util');

exports.handler = function (event, context) {
    try {

        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }


        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }


        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request, event.session, new Response(context, event.session));
        } else if (event.request.type === 'IntentRequest') {
            var response = new Response(context, event.session);
            if (event.request.intent.name in intentHandlers) {
                intentHandlers[event.request.intent.name](event.request, event.session, response, getSlots(event.request));
            } else {
                response.speechText = 'Unknown intent';
                response.shouldEndSession = true;
                response.done();
            }
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail('Exception: ' + getError(e));
    }
};

function getSlots(req) {
    var slots = {};
    for (var key in req.intent.slots) {
        slots[key] = req.intent.slots[key].value;
    }
    return slots;
}

var Response = function (context, session) {
    this.speechText = '';
    this.shouldEndSession = true;
    this.ssmlEn = true;
    this._context = context;
    this._session = session;

    this.done = function (options) {

        if (options && options.speechText) {
            this.speechText = options.speechText;
        }

        if (options && options.repromptText) {
            this.repromptText = options.repromptText;
        }

        if (options && options.ssmlEn) {
            this.ssmlEn = options.ssmlEn;
        }

        if (options && options.shouldEndSession) {
            this.shouldEndSession = options.shouldEndSession;
        }

        this._context.succeed(buildAlexaResponse(this));
    };

    this.fail = function (msg) {
        this._context.fail(msg);
    };

};

function createSpeechObject(text, ssmlEn) {
    if (ssmlEn) {
        return {
            type: 'SSML',
            ssml: '<speak>' + text + '</speak>'
        };
    } else {
        return {
            type: 'PlainText',
            text: text
        };
    }
}

function buildAlexaResponse(response) {
    var alexaResponse = {
        version: '1.0',
        response: {
            outputSpeech: createSpeechObject(response.speechText, response.ssmlEn),
            shouldEndSession: response.shouldEndSession
        }
    };

    if (response.repromptText) {
        alexaResponse.response.reprompt = {
            outputSpeech: createSpeechObject(response.repromptText, response.ssmlEn)
        };
    }

    if (response.cardTitle) {
        alexaResponse.response.card = {
            type: 'Simple',
            title: response.cardTitle
        };

        if (response.imageUrl) {
            alexaResponse.response.card.type = 'Standard';
            alexaResponse.response.card.text = response.cardContent;
            alexaResponse.response.card.image = {
                smallImageUrl: response.imageUrl,
                largeImageUrl: response.imageUrl
            };
        } else {
            alexaResponse.response.card.content = response.cardContent;
        }
    }

    if (!response.shouldEndSession && response._session && response._session.attributes) {
        alexaResponse.sessionAttributes = response._session.attributes;
    }
    return alexaResponse;
}

function getError(err) {
    var msg = '';
    if (typeof err === 'object') {
        if (err.message) {
            msg = ': Message : ' + err.message;
        }
        if (err.stack) {
            msg += '\nStacktrace:';
            msg += '\n====================\n';
            msg += err.stack;
        }
    } else {
        msg = err;
        msg += ' - This error is not object';
    }
    return msg;
}


//--------------------------------------------- Skill specific logic starts here ----------------------------------------- 

//Add your skill application ID from amazon devloper portal
var APP_ID = process.env.APP_ID;

function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here

}

function onSessionEnded(sessionEndedRequest, session) {
    // Add any cleanup logic here

}

function onLaunch(launchRequest, session, response) {
    if (!session.user.accessToken) {

        response.speechText = "Hi there, to experience the best of our service, request you to link your account. please click on, Link Account in your alexa app";
        response.isAccountLinking = "true";
        response.shouldEndSession = true;
        response.done();
    } else {
        var conn = new jsforce.Connection({
            instanceUrl: process.env.INSTANCE_URL,
            accessToken: session.user.accessToken
        });
        // console.log(util.inspect(conn, { showHidden: true, depth: null }));

        conn.identity(function (err, res) {

            session.attributes.loggedInUser = res;
            if (err) {
                return console.error(err);
            }

            //console.log(res);
            //console.log("user ID: " + res.user_id);
            //console.log("organization ID: " + res.organization_id);
            //console.log("username: " + res.username);
            //console.log("display name: " + res.display_name);
            response.speechText = `Hi ${res.display_name}, How can I help you today?`;
            response.repromptText = 'How can I help you today?';
            response.shouldEndSession = false;
            response.done();
        });

    }
}
/*
intentHandlers['CreateAnEmergencyCase'] = function (request, session, response, slots) {
    //console.log(`Entered Emergency case block`);
    createACase(session, true, 'test', 'test', function (resp, err) {
        if (err) console.log(err);
        response.speechText = `I've created a case with Case Number ${resp}`;
        response.shouldEndSession = true;
        response.done();
    });
}*/

intentHandlers['CreateServiceRequest'] = function (request, session, response, slots) {
    response.speechText = `On whose behalf would you like to create a case?`;
    response.shouldEndSession = false;
    session.attributes.newCase = true;
    response.done();
}

intentHandlers['CreateACaseComment'] = function (request, session, response, slots) {
    session.attributes.ccBlock = true;
    response.speechText = `Which contact do you want to add case comment to?`;
    response.shouldEndSession = false;
    response.done();

}

intentHandlers['AMAZON.YesIntent'] = function (request, session, response, slots) {

    if (!session.attributes.onlyOneCase) {
        myCases(session, function (data, err) {
            var responseText = `Here are your open cases.`;
            for (var i = 0; i < data.totalSize; i++) {
                responseText += ` Case ${i + 1}, ${data.records[i].Subject}.`;
            }
            response.speechText = `${responseText} Which case would you like to add a comment to?`;
            response.shouldEndSession = false;
            session.attributes.isListMyCases = true;
            session.attributes.caseSubjectsResult = data.records;
            response.done();
        })
    }
}

intentHandlers['NumberIntent'] = function (request, session, response, slots) {
    var wordNumberSlot = slots.wordNumberSlot;
    var numberSlot = slots.numberSlot;
    var csNum;
    if (wordNumberSlot) csNum = parseInt(wordNumberSlot);
    else csNum = numberSlot;
    console.log(csNum);

    // if (session.attributes.moreThanOneCase) {
    response.speechText = `what do you want me to add to the case with subject, ${session.attributes.caseSubjectsResult[csNum - 1].Subject}?`;
    response.shouldEndSession = false;
    session.attributes.idToAddCaseComment = session.attributes.caseSubjectsResult[csNum - 1].Id;
    response.done();

}

intentHandlers['freeFormTextIntent'] = function (request, session, response, slots) {
    var freeFormTextSlot = slots.freeFormTextSlot;
    //var idToAddCaseComment = session.attributes.idToAddCaseComment;
    console.log('****===>' + freeFormTextSlot);

    if (session.attributes.newCase) {
        var subjectAndDescription = freeFormTextSlot;
        if (!session.attributes.userName) {
            getUser(session, subjectAndDescription, function (data, err) {
                if (err) console.log(err)
                response.speechText = `what's the subject?`;
                session.attributes.userName = data;
                response.shouldEndSession = false;
                response.done();
            });
        } else if (!session.attributes.isDescReceived) {
            response.speechText = `Please explain your issue in detail?`;
            response.shouldEndSession = false;
            session.attributes.subject = subjectAndDescription;
            session.attributes.isDescReceived = true;
            response.done();
        } else {
            createACase(session, false, session.attributes.subject, session.attributes.userName, subjectAndDescription, function (data, err) {
                if (err) console.log(err)
                response.speechText = `I've created a case with Case Number ${data}. Is there anything else that I can help you with?`;
                response.shouldEndSession = false;
                session.attributes.newCase = false;
                response.done();
            });
        }
    } else if (session.attributes.ccBlock && !session.attributes.idToAddCaseComment) {
        if (!session.attributes.contactUserId) {
            getUser(session, freeFormTextSlot, function (data1, err) {
                if (err) console.log(err)
                // response.speechText = `what's the subject?`;
                session.attributes.contactUserId = data1;
                myCases(session, function (data, err) {
                    console.log(data.totalSize);
                    if (data.totalSize > 1) {
                        console.log(`B1`);
                        response.speechText = `There are ${data.totalSize} cases on given name. do you want me to list the case subjects to pick one?`;
                        response.shouldEndSession = false;
                        session.attributes.onlyOneCase = false;
                        //session.attributes.ccBlock = false;
                        session.attributes.casesList = data;
                        response.done();
                    } else if (data.totalSize == 0) {
                        console.log(`B2`);
                        response.speechText = `There are no cases on the given name. Thank you!!!`;
                        response.shouldEndSession = true;
                        response.done();
                    } else {
                        console.log(`B3`);
                        response.speechText = `what do you want me to add to the case with subject, ${data.records[0].Subject}?`;
                        session.attributes.idToAddCaseComment = data.records[0].Id;
                        response.shouldEndSession = false;
                        session.attributes.ccBlock = false;
                        session.attributes.onlyOneCase = true;
                        response.done();
                    }
                });
            })
        }
    } else {
        createCaseComment(session, session.attributes.idToAddCaseComment, freeFormTextSlot, function (resp, err) {
            if (err) console.log(err)
            response.speechText = `I've created a case comment. Is there anything else that I can help you with?`;
            response.shouldEndSession = false;
            session.attributes = {};
            response.done();
        });
    }
}


intentHandlers['AMAZON.NoIntent'] = function (request, session, response, slots) {

    if (session.attributes.ccBlock) {
        response.speechText = `Ok. please give the case number that you like to add the case comment to`;
        response.reprompt = `what is the case number that you want to add a case comment to?`;
        response.shouldEndSession = false;
        session.attributes.ccBlock = false;
        response.done();
    } else {
        response.speechText = `Thank you for using our service. Have a good day!!!`;
        response.shouldEndSession = true;
        response.done();
    }

}
intentHandlers['AMAZON.CancelIntent'] = function (request, session, response, slots) {
    response.speechText = `Thank you for using our service. Have a good day!!!`;
    response.shouldEndSession = true;
    response.done();
}


intentHandlers['AMAZON.StopIntent'] = function (request, session, response, slots) {
    response.speechText = `Thank you for using our service. Have a good day!!!`;
    response.shouldEndSession = true;
    response.done();
}


/*Rest Services*/
function createACase(session, urgent, cSubject, uId, cDescription, callback) {
    //console.log(cSubject + cDescription);
    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    if (urgent) {
        conn.sobject("Case").create({
            'Subject': 'Accident',
            'Description': 'Vehicle met with an Accident',
            'contactId': uId

        }, function (err, ret) {
            if (err || !ret.success) {
                callback(console.error(err, ret));
            }
            //console.log(ret);
            callback(ret);
        }).then((data) => {
            conn.query(`Select Id, CaseNumber from Case where Id = '${data.id}'`, function (err, response) {
                if (err) {
                    callback(err);
                }
                //console.log(response);
                callback(response.records[0].CaseNumber);
            });
        });
    } else {
        conn.sobject("Case").create({
            'Subject': cSubject,
            'Description': cDescription,
            'contactId': uId

        }, function (err, ret) {
            if (err || !ret.success) {
                callback(console.error(err, ret));
            }
            //console.log(ret);
            return ret;
        }).then((data) => {
            conn.query(`Select Id, CaseNumber from Case where Id = '${data.id}'`, function (err, response) {
                if (err) {
                    callback(err);
                }
                //console.log(response);
                callback(response.records[0].CaseNumber);
            });
        });
    }

}

function getNoOfCases(session, callback) {
    console.log(session.attributes.contactUserId);

    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    conn.query(`Select count(ID) from Case where status='new' and contactId = '${session.attributes.contactUserId}'`, function (err, caseCount) {
        if (err) {
            console.error(err);
            callback(err);
        }
        console.log(JSON.stringify(caseCount));
        callback(caseCount);
    });
}

function myCases(session, callback) {
    console.log(session.attributes.contactUserId);

    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    conn.query(`Select ID, Subject from Case where status='new' and ContactId= '${session.attributes.contactUserId}'`, function (err, response) {
        if (err) {
            callback(err);
        }
        console.log(response);
        callback(response);
    });
}

function getCaseFromCaseNumber(session, caseNumber, callback) {
    console.log('Entered Next block');
    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    conn.query(`Select Id, Subject from Case where CaseNumber='${caseNumber}'`, function (err, response) {
        if (err) {
            console.log(err);
            callback(err);
        }
        console.log(response);
        callback(response);
    });
}

function createCaseComment(session, caseId, comment, callback) {
    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    //console.log(caseId + "\t" + comment);
    conn.sobject("CaseComment").create({
        CommentBody: comment,
        isPublished: 'true',
        ParentId: caseId
    }, function (err, ret) {
        if (err || !ret.success) {
            console.log(err);
            callback(err)
        }
        //console.log(ret);
        callback(ret);
    });
}


function getUser(session, uName, callback) {
    // session.attributes.contactUserId = '';
    var conn = new jsforce.Connection({
        instanceUrl: process.env.INSTANCE_URL,
        accessToken: session.user.accessToken
    });
    conn.query(`select Id, firstname, lastname from contact where firstname like '%${uName}%'`, function (err, caseCount) {
        if (err) {
            callback(console.error(err));
        }
        session.attributes.contactUserId = caseCount.records[0].Id;
        callback(caseCount.records[0].Id);
    });
}