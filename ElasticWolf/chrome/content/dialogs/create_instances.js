var ew_InstanceLauncher = {
    image : null,
    ew_session : null,
    retVal : null,
    securityGroups: null,
    unusedSecGroupsList : null,
    usedSecGroupsList : null,
    vpcMenu : null,
    azMenu : null,
    tnMenu: null,
    subnetMenu : null,
    unused : new Array(),
    used : new Array(),

    launch : function()
    {
        if (!this.validateMin()) return false;
        if (!this.validateMax()) return false;

        this.retVal.imageId = this.image.id;
        this.retVal.kernelId = document.getElementById("ew.newinstances.aki").value;
        this.retVal.ramdiskId = document.getElementById("ew.newinstances.ari").value;
        this.retVal.instanceType = document.getElementById("ew.newinstances.instancetypelist").selectedItem.value;
        this.retVal.minCount = document.getElementById("ew.newinstances.min").value.trim();
        this.retVal.maxCount = document.getElementById("ew.newinstances.max").value.trim();
        this.retVal.tag = document.getElementById("ew.newinstances.tag").value.trim();
        this.retVal.name = document.getElementById("ew.newinstances.name").value.trim();
        this.retVal.securityGroups = this.used;

        var subnet = document.getElementById("ew.newinstances.subnetId").value;
        if (subnet == "" && this.vpcMenu.value != "") {
            alert("No subnet selected for VPC. Please select a subnet to continue.");
            return false;
        }
        this.retVal.subnetId = subnet;
        this.retVal.ipAddress = document.getElementById("ew.newinstances.ipAddress").value.trim();

        // This will be an empty string if <none> is selected
        this.retVal.keyName = document.getElementById("ew.newinstances.keypairlist").selectedItem.value;

        // This will be an empty string if <any> is selected
        this.retVal.placement = { "availabilityZone" : this.azMenu.value, "tenancy": this.tnMenu.value };

        this.retVal.userData = document.getElementById("ew.newinstances.userdata").value;
        if (this.retVal.userData == "") {
            this.retVal.userData = null;
        }
        this.retVal.properties = document.getElementById("ew.newinstances.properties").value;
        if (this.retVal.properties == "") {
            this.retVal.properties = null;
        }
        this.retVal.ok = true;

        return true;
    },

    validateMin : function()
    {
        var textbox = document.getElementById("ew.newinstances.min");
        var val = parseInt(textbox.value);
        if (val <= 0 || isNaN(val) || val > 50) {
            alert("Minimum value must be a positive integer between 1 and 50");
            textbox.select();
            return false;
        }
        return true;
    },

    validateMax : function()
    {
        // Assumes validateMin has been called
        var maxtextbox = document.getElementById("ew.newinstances.max");
        var maxval = parseInt(maxtextbox.value);
        if (maxval <= 0 || isNaN(maxval) || val > 50) {
            alert("Maximum value must be a positive integer between 1 and 50");
            maxtextbox.select();
            return false;
        }
        var mintextbox = document.getElementById("ew.newinstances.min");
        var minval = parseInt(mintextbox.value);
        if (minval > maxval) {
            alert("Maximum value may not be smaller than minimum value between 1 and " + maxval);
            maxtextbox.select();
            return false;
        }
        return true;
    },

    buildGroupList : function()
    {
        this.unused.splice(0, this.unused.length);
        this.used.splice(0, this.used.length);

        for (var i in this.securityGroups) {
            if (this.securityGroups[i].vpcId == this.vpcMenu.value) {
                this.unused.push(this.securityGroups[i]);
            }
        }
    },

    getSecurityGroup : function(id)
    {
        for (var i in this.securityGroups) {
            if (this.securityGroups[i].id == id) {
                return this.securityGroups[i]
            }
        }
        return null
    },

    addSecurityGroup : function()
    {
        var selected_list = [];

        for (var i = 0; i < this.unusedSecGroupsList.getRowCount(); i++) {
            var item = this.unusedSecGroupsList.getItemAtIndex(i);
            if (item.selected && item.value) {
                var group = this.getSecurityGroup(item.value)
                if (group) {
                    this.used.push(group);
                    selected_list.push(group.id);
                }
            }
        }

        for (var i = this.unused.length - 1; i >= 0; i--) {
            for (var j = 0; j < selected_list.length; j++) {
                if (this.unused[i].id == selected_list[j]) {
                    this.unused.splice(i, 1);
                    break;
                }
            }
        }

        this.refreshDisplay();
    },

    removeSecurityGroup : function()
    {
        var selected_list = [];

        for ( var i = 0; i < this.usedSecGroupsList.getRowCount(); i++) {
            var item = this.usedSecGroupsList.getItemAtIndex(i);
            if (item.selected && item.value) {
                var group = this.getSecurityGroup(item.value)
                if (group) {
                    this.unused.push(group);
                    selected_list.push(group.id);
                }
            }
        }

        for ( var i = this.used.length - 1; i >= 0; i--) {
            for ( var j = 0; j < selected_list.length; j++) {
                if (this.used[i].id == selected_list[j]) {
                    this.used.splice(i, 1);
                    break;
                }
            }
        }

        this.refreshDisplay();
    },

    vpcIdSelected : function()
    {
        var sel = this.vpcMenu.selectedItem;
        var az = this.azMenu.value

        // Reset subnets
        this.subnetMenu.removeAllItems();
        document.getElementById("ew.newinstances.ipAddress").disabled = true;

        if (sel.value != null && sel.value != '') {
            var subnets = this.ew_session.model.get('subnets');
            for ( var i in subnets) {
                if (subnets[i].vpcId == sel.value && (az == "" || az == subnets[i].availabilityZone)) {
                    this.subnetMenu.appendItem(subnets[i].toString(), subnets[i].id)
                }
            }
            this.subnetMenu.selectedIndex = 0;
            document.getElementById("ew.newinstances.ipAddress").disabled = false;
        }

        this.buildGroupList();
        this.refreshDisplay();
    },

    loadUserDataFromFile : function(fBinary)
    {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, "Load user data", nsIFilePicker.modeLoad);
        fp.appendFilters(nsIFilePicker.filterAll);

        var res = fp.show();
        if (res == nsIFilePicker.returnOK) {
            var userdataFile = fp.file;
            var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
            // Open the file for read (01)
            inputStream.init(userdataFile, 0x01, 0400, null);
            var sis = null;
            var contents = null;
            if (fBinary) {
                sis = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);
                sis.setInputStream(inputStream);
                contents = sis.readByteArray(sis.available());
                contents = "Base64:" + Base64.encode(contents);
            } else {
                sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
                sis.init(inputStream);
                contents = sis.read(sis.available());
            }

            inputStream.close();

            document.getElementById("ew.newinstances.userdata").value = contents;
        }
    },

    init : function()
    {
        this.image = window.arguments[0];
        this.ew_session = window.arguments[1];
        this.retVal = window.arguments[2];

        // Get the list of keypair names visible to this user.
        // This will trigger a DescribeKeyPairs if the model
        // doesn't have any keypair info yet. If there are no keypairs,
        // this dialog shouldn't be initialized any further.
        var keypairs = this.ew_session.model.get('keypairs');
        if (keypairs == null) {
            alert("Please create a keypair before launching an instance");
            return false;
        }

        var keypairMenu = document.getElementById("ew.newinstances.keypairlist");
        keypairMenu.appendItem("<none>", null);
        for ( var i in keypairs) {
            keypairMenu.appendItem(keypairs[i].name, keypairs[i].name);
        }
        // If the user created at least one EC2 Keypair, select it.
        keypairMenu.selectedIndex = (keypairs.length > 0) ? 1 : 0;

        var typeMenu = document.getElementById("ew.newinstances.instancetypelist");
        // Add the instance sizes based on AMI architecture
        var types = this.ew_session.model.getInstanceTypes(this.image.arch);
        for (var i in types) {
            typeMenu.appendItem(types[i].name, types[i].id);
        }
        typeMenu.selectedIndex = 0;

        var textBox = document.getElementById("ew.newinstances.ami");
        textBox.value = this.image.id;

        textBox = document.getElementById("ew.newinstances.ami.tag");
        textBox.value = this.image.tag || "";

        textBox = document.getElementById("ew.newinstances.ami.location");
        textBox.value = this.image.location.split('/').pop();

        textBox = document.getElementById("ew.newinstances.min");
        textBox.focus();

        // availability zones
        this.azMenu = document.getElementById("ew.newinstances.azId");
        this.azMenu.appendItem("<any>", null);
        var availZones = this.ew_session.model.get('availabilityZones');
        for ( var i in availZones) {
            this.azMenu.appendItem(availZones[i].name + " (" + availZones[i].state + ")", availZones[i].name);
        }
        this.azMenu.selectedIndex = 0;

        this.tnMenu = document.getElementById("ew.newinstances.tenancy");

        // vpcs
        this.vpcMenu = document.getElementById("ew.newinstances.vpcId");
        this.subnetMenu = document.getElementById("ew.newinstances.subnetId");

        document.getElementById("ew.newinstances.ipAddress").disabled = true;

        // Grab handles to the unused and used security group lists.
        this.unusedSecGroupsList = document.getElementById("ew.newinstances.secgroups.unused");
        this.usedSecGroupsList = document.getElementById("ew.newinstances.secgroups.used");

        // Get the list of security groups visible to this user. This will trigger a DescribeSecurityGroups
        // if the model doesn't have any info yet.
        this.securityGroups = this.ew_session.model.get('securityGroups');
        this.buildGroupList();

        var aki = this.image.aki;
        var ari = this.image.ari;

        // Populate the AKI and ARI lists
        var akiList = document.getElementById("ew.newinstances.aki");
        var ariList = document.getElementById("ew.newinstances.ari");
        var images = this.ew_session.model.get('images');
        var akiRegex = regExs["aki"];
        var ariRegex = regExs["ari"];
        akiList.appendItem("");
        ariList.appendItem("");

        if (!isWindows(this.image.platform)) {
            i = 0;
            var imgId = null;
            for (i in images) {
                imgId = images[i].id;
                if (imgId.match(akiRegex)) {
                    akiList.appendItem(imgId);
                    continue;
                }

                if (imgId.match(ariRegex)) {
                    ariList.appendItem(imgId);
                }
            }

            akiList.value = aki;
            ariList.value = ari;
        }

        // Populate VPCs
        var vpcs = this.ew_session.model.get('vpcs');
        this.vpcMenu.appendItem("", "");
        for (var i in vpcs) {
            this.vpcMenu.appendItem(vpcs[i].toString(), vpcs[i].id);
        }
        this.vpcMenu.selectedIndex = 0;
        this.vpcIdSelected();
        this.refreshDisplay();
    },

    refreshDisplay : function()
    {
        while (this.unusedSecGroupsList.getRowCount() > 0) {
            this.unusedSecGroupsList.removeItemAt(0);
        }
        while (this.usedSecGroupsList.getRowCount() > 0) {
            this.usedSecGroupsList.removeItemAt(0);
        }

        this.used.sort();
        this.unused.sort();

        for (var i in this.unused) {
            this.unusedSecGroupsList.appendItem(this.unused[i].id + ": " + this.unused[i].name + ": " + this.unused[i].description, this.unused[i].id);
        }
        for (var i in this.used) {
            this.usedSecGroupsList.appendItem(this.used[i].id + ": " + this.used[i].name + ": " + this.used[i].description, this.used[i].id);
        }
    }
}
