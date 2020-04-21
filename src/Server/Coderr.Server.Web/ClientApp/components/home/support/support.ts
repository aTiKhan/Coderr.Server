import { AppRoot } from '../../../services/AppRoot';
import { SendSupportRequest } from "../../../dto/Core/Support";
import Vue from "vue";
import { Component } from "vue-property-decorator";
import * as SimpleMDE from "SimpleMDE";

@Component
export default class SupportComponent extends Vue {
    private simpleMde$: SimpleMDE;
    message = "";
    referer = "";
    sent = false;

    created() {
        this.referer = document.referrer;

    }


    mounted() {
        if (this.$route.params.type === "configuration") {
            var area = <HTMLTextAreaElement>document.getElementById("SupportMessage");
            area.value =
                "I've downloaded the correct Coderr client using nuget and added the correct configuration code lines.\r\n\r\nHowever, when I try to report an error (using a try/catch) block, nothing gets reported to the Coderr Server.";
        }
        if (this.$route.params.type === "configdemo") {
            var area = <HTMLTextAreaElement>document.getElementById("SupportMessage");
            area.value =
                "I've downloaded the correct Coderr client using nuget and added the correct configuration code lines.\r\n\r\nHowever, when I try to report an error (using a try/catch) block, nothing gets reported to the Coderr Server.\r\n\r\nI would like to book a demo with one of your developers.";
        }
        this.simpleMde$ = new SimpleMDE({ element: document.getElementById("SupportMessage") });
        
    }

    sendMessage() {
        var cmd = new SendSupportRequest();

        cmd.Message = this.simpleMde$.value();
        cmd.Subject = "Support request";
        cmd.Url = this.referer;
        AppRoot.Instance.apiClient.command(cmd)
            .then(x => {
                AppRoot.notify('Suport request have been sent. We will contact you shortly.');
                this.sent = true;
            });
    }

}
