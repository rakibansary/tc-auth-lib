
function (user, context, callback) {
    if ((context.clientID === configuration.CLIENT_ACCOUNTS_LOGIN)) { // client/application specific
        // TODO: implement your rule
        if (context.redirect) {
            console.log("context redirect called, existing from custom -claims");
            return callback(null, user, context);
            // returnning from here no need to check further  
        }
        const _ = require('lodash');
        console.log("Enter Rule: Custom-Claims");
        let handle = _.get(user, "handle", null);
        const provider = _.get(user, "identities[0].provider", null);
        if (!handle && provider === "auth0") {
            handle = _.get(user, "nickname", null);
        }
        console.log("Fetch roles for email/handle: ", user.email, handle, provider);
        global.AUTH0_CLAIM_NAMESPACE = "https://" + configuration.DOMAIN + "/";
        try {
            request.post({
                url: 'https://api.' + configuration.DOMAIN + '/v3/users/roles',
                form: {
                    email: user.email,
                    handle: handle
                }
            }, function (err, response, body) {
                console.log("called topcoder api for role: response status - ", response.statusCode);
                if (err) return callback(err, user, context);
                if (response.statusCode !== 200) {
                    return callback('Login Error: Whoops! Something went wrong. Looks like your registered email has discrepancy with Authentication. Please connect to our support <a href="mailto:support@topcoder.com">support@topcoder.com</a>. Back to application ', user, context);
                }

                let res = JSON.parse(body);
                // TODO need to double sure about multiple result or no result 
                let userId = res.result.content.id;
                let handle = res.result.content.handle;
                let roles = res.result.content.roles.map(function (role) {
                    return role.roleName;
                });
                let userStatus = res.result.content.active; // true/false 

                // TEMP
                let tcsso = res.result.content.regSource || '';

                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'roles'] = roles;
                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'userId'] = userId;
                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'handle'] = handle;
                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'user_id'] = user.identities[0].provider + "|" + userId;
                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'tcsso'] = tcsso;
                context.idToken[global.AUTH0_CLAIM_NAMESPACE + 'active'] = userStatus;
                context.idToken.nickname = handle;
              
              if (!userStatus) {
                   context.redirect = {
      								url: `https://accounts-auth0.${configuration.DOMAIN}/check_email.html`
    						    };
                  return callback(null, user, context);
                }
              
                //console.log(user, context);
                return callback(null, user, context);
            }
            );
        } catch (e) {
            console.log("Error in calling user roles" + e);
            return callback("Something went worng!. Please retry.", user, context);
        }
    } else {
        // for other apps do nothing 
        return callback(null, user, context);
    }
}