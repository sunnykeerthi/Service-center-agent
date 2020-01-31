
# Service-center-agent
Service center agent Alexa Skill

As a service center agent, one can create the below tasks.  

-   Create service requests on one’s behalf.
-   Update service requests.
-   Add case comments to existing service requests.

Alexa Setup

AWS Console

1. <-------- Video Lambda 2 ----->
2. Navigate [here](https://github.com/sunnykeerthi/Service-center-agent/blob/master/index.js) to get the code.
3. Clone the code into local repo.
4. Open your favorite IDE and follow the below steps.
    1. cd [folder name].
    2. npm install.
    3. zip the contents. *_Note:_* Zip the folder contents, not the folder.
5. Navigate to [AWS Console](https://console.aws.amazon.com/console/home)
6. Create a new Lambda function.
7. Create a new function.
    1. Give it a name.
    2. Use an existing role.
    3. Select lambda_basic_execution from drop down.
    4. Create Function.
8. Now a blank new function is created for us. Click *Add trigger.*
9. Select Alexa Skills kit from dropdown. and Disable Skill ID verification and Add.
    <!----- Video Lambda 1----->
10. On lambda function page, scroll down select upload zip from the drop down and select the zip that was built in 6c.
11. Create 2 Environment variable and leave it blank, we’ll get back to it later.
    1. INSTANCE_URL
    2. APP_ID
12. Increase the Timer under Basic Settings to 1min. This is to avoid timeouts during processing.
13. Save.
14.  <---- Video Lambda 2----->
15. Copy the ARN in the top right to a notepad.

<------ ARN Image----->


Amazon Developer Console

1. Navigate to [link] for code.
2. Login to [Developer Console](https://developer.amazon.com/).
3. Click Developer console on top right and select Alexa Skills Kit by hovering on *Alexa* in the top ribbon.
4. Click Create Skill, Give a Skill Name and leave the rest to default. Then you would be prompted to Choose a template, Leave it to default and Click Choose. A skill is created now.
5. Select JSON Editor from the left ribbon. 
6. Copy the code from Step 1 and replace the JSON Editor Content with it. and change *invocationName* to your skill name.
7. Click Save Model and the Build Model. Give it a minute to build.
8. Once built Navigate to End Points from left menu. And Select *AWS ARN* radio.
9. Copy *Your Skill ID *on a notepad.
10. under *Default Region*, paste the ARN that you copied in previous section (Step 15).

We are done (Partially) building the skill.

Updating the Model

1. Navigate back to AWS Console. And let’s fill in the Environment variables that we created earlier.
2. For APP_ID the value should be *Your Skill ID *you copied in the previous step.
3. For INSTANCE_URL use your Salesforce Instance URL.
4. Save the model.

Now we have a full fledge skill built. Where both Alexa and our lambda function are connected.

Finalizing the Model

As final steps, we need to link our Salesforce Account with Alexa so that we can start communicating with the platform.

Navigate to Account linking from the left menu on Amazon Developer Account. 
Do you allow users to create an account or link to an existing account with you? *turn on *
Select an authorization grant type*  *Auth Code Grant*
Scroll down to bottom to see *Alexa Redirect URLs. *There should be three of them. Copy them onto a notepad.


To do Account linking, you should have OAuth details and these can be obtained by creating a Connected App in Salesforce. [Here](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_defining_remote_access_applications.htm) is more info Connected App.

 * Under *Scopes* add the below.

    * Access and manage your data (api)
    * Full access (full)
    * Perform requests on your behalf at any time (refresh_token, offline_access)

 * Under *Callback URL,* paste the Alexa Redirect URLs that you copied in notepad earlier.
 * Save.
 * Once the app is created. copy *Consumer Key *and *Consumer Secret *(Click to reveal).
 * Navigate back to Amazon Developer Console and start filling the details as below and save.

	 * Authorization URI* -> https://login.salesforce.com/services/oauth2/authorize	 
	 * Access Token URI* ->	https://login.salesforce.com/services/oauth2/token	 
	 * Your Client ID* ->	Consumer Key from above
	 * Your Secret* ->	Consumer Secret from above
	 * Your Authentication Scheme* ->  HTTP Basic (Recommended)	
	 * Scope (Add each word in a row) ->	refresh_token, api, full 
	 * Default Access Token Expiration Time  ->	blank

This concludes our Alexa Setup for Service Center Agent.
