let all_tags = null;

getTags().then(tags => {
    all_tags = tags;
    console.log("Tags loaded");
}).then(function() {
    Front.contextUpdates.subscribe(context => {
        //Init the head with no contact
        displayHeader();

        switch (context.type) {
            case 'noConversation':
                break;
            case 'singleConversation':
                let conversation = context.conversation;
                $.ajax({
                    url: 'https://mailtools.flexmls.com/api/finger.json',
                    type: 'POST',
                    data: {search_term: conversation.recipient.handle},
                    dataType: 'json',
                    xhrFields: {withCredentials: true},
                }).done(function (results) {
                    displayContactInfo(context, results);
                }).fail(function (req, status) {
                    //can't catch a 302, so just catch the post redirect failure
                    Front.openUrlInPopup('https://mailtools.flexmls.com/ticket');
                });
                break;
            case 'multiConversations':
                //console.log('Multiple conversations selected', context.conversations);
                break;
            default:
                console.error(`Unsupported context type: ${context.type}`);
                break;
        }
    });
});

function displayHeader(contact = null) {
    var display_name = "No Contact";
    var handle = "-";
    var phone = "-";

    document.getElementById("infoSection").innerHTML = '';

    if (contact) {
        display_name = contact.name || contact.handle;
        handle = contact.handle;
    }

    document.getElementById("name").textContent = display_name;
    document.getElementById("handle").textContent = handle;
    document.getElementById("phone").textContent = phone;
}

function displayContactInfo(context, fbsusers) {
    var mls = [];

    var thingswecareabout = {
        "FirstName": "First Name",
        "LastName": "Last Name",
        "ShortId": "Short Id",
        "LoginName": "Login Name",
        "Mls": "Mls",
        "GroupName": "Group",
        "MemberType": "Member Type",
        "City": "City",
        "StateOrProvince": "State",
        "PostalCode": "Postal Code"
    };

    displayHeader(context.conversation.recipient);

    if (fbsusers.length > 0) {
        fbsusers.forEach((fbsuser) => {
            mls.push(fbsuser['Mls']);
            var info = document.getElementById("infoSection");

            for (var key in thingswecareabout) {
                var div = document.createElement('div');
                div.setAttribute('class', 'row');

                var keydiv = document.createElement('div');
                keydiv.setAttribute('class', 'rowItem infoKey font');
                keydiv.innerHTML = thingswecareabout[key];
                div.appendChild(keydiv);

                var valdiv = document.createElement('div');
                valdiv.setAttribute('class', 'rowItem infoValue font');
                valdiv.innerHTML = fbsuser[key];
                div.appendChild(valdiv);

                info.appendChild(div);
            }

            if (document.getElementById("phone").textContent === '-') {
                document.getElementById("phone").textContent = fbsuser.PrimaryPhone;
            }

            info.appendChild(document.createElement('hr'));
        });

        // get rid of duplicates in mls list then tag if there's only one MLS
        addTag(context, 'FGO'); // hotwiring this to always fire for testing
        if (Array.from(new Set(mls)).length == 1) {
            addTag(conversation, mls[0]);
        }
    }
}

async function getTags() {
    console.log("Loading tags");
    const list = await Front.listTags();

    let token = list.nextPageToken;
    const this_tags = list.results;

    while (token) {
        console.log("Making pagination request for " + token);
        const { results, nextPageToken } = await Front.listTags(token);
        token = nextPageToken;
        this_tags.push(...results);
    }

    return this_tags;
}

function addTag(context, mls) {
    // don't bother creating / tagging these
    var ignore_these = ["FVT", "DEMOMLS", "SPARK"];
    mls = mls.toUpperCase();
    
    if (ignore_these.includes(mls)) {
        console.log("Ignoring " + mls);
        return;
    }
    
    let id = false;
    $.each(all_tags, function (key, value) {
        if (value.name == mls) {
            id = value.id;
            console.log("Found tag for " + mls);
        }
    });

    if (id) {
        context.tag([id]);
        // tried Front.tag([id]); here as well with same result
        console.log("Adding tag for id " + id + " and MLS code " + mls);
    } else {
        console.log("Creating new tag for MLS code " + mls);
        // $.ajax({
        //     url: 'https://api2.frontapp.com/tags',
        //     type: 'POST',
        //     data: { name: mls },
        //     dataType: 'json',
        //     xhrFields: { withCredentials: true },
        // }).done(function (results) {
        //     console.dir(results);
        //     console.log("Added tag, now attaching to conversation");
        //     conversation.tag([results.id]);
        // });
    }
}