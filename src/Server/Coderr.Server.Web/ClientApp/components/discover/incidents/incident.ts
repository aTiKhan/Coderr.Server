import { PubSubService } from "../../../services/PubSub";
import { IHighlight, IncidentService } from "@/services/incidents/IncidentService";
import { AppRoot } from '../../../services/AppRoot';
import { ApplicationMember } from "../../../services/applications/ApplicationService";
import { GetIncident, GetIncidentResult, GetIncidentStatistics, GetIncidentStatisticsResult, ReportDay, QuickFact } from "../../../dto/Core/Incidents";
import Vue from "vue";
import { Component } from "vue-property-decorator";
import Chartist from "chartist";
import * as moment from 'moment';


@Component
export default class IncidentComponent extends Vue {
    private static activeBtnTheme: string = 'btn-dark';

    incidentId: number;
    incident: GetIncidentResult = new GetIncidentResult;
    isIgnored: boolean = false;
    isClosed = false;

    highlights: IHighlight[] = [];

    team: ApplicationMember[] = [];
    created() {
        this.incidentId = parseInt(this.$route.params.incidentId, 10);
        AppRoot.Instance.incidentService.get(this.incidentId)
            .then(result => {
                this.incident = result;
                this.isIgnored = result.IsIgnored;
                this.isClosed = result.IsSolved;
                result.Facts = result.Facts.filter(v => v.Value !== '0');
                
                if (result.AssignedToId > 0) {
                    var fact = new QuickFact();
                    fact.Description = 'Assigned at ' + moment(result.AssignedAtUtc);
                    fact.Title = "Assigned to";
                    fact.Value = result.AssignedTo;
                    result.Facts.push(fact);
                }
                
                this.displayChart(result.DayStatistics);
                AppRoot.Instance.applicationService.getTeam(result.ApplicationId)
                    .then(x => {
                        this.team = x;
                    });

                AppRoot.Instance.incidentService.collectHighlightedData(result)
                    .then(data => {
                        //this.highlights = data;
                    });
            });
    }

    ignore() {
        AppRoot.modal({
            title: "Ignore incident",
            htmlContent:
                "<p>This feature will hide incident from the search result and throw away all future error reports without analyzing them.</p>",
            submitButtonText: "Ignore reports",
            footerHint: "<a href=\"https://coderr.io/documentation/features/incident/close/\">Learn more about this feature</a>"
        }).then(x => {
            AppRoot.Instance.incidentService.ignore(this.incidentId)
                .then(x => {
                    AppRoot.notify('Incident marked as ignored.');
                    this.isIgnored = true;
                });
        });
    }

    assignToMe() {
        AppRoot.Instance.incidentService.assignToMe(this.incidentId)
            .then(x => {
                this.$router.push({ name: 'analyzeIncident', params: { incidentId: this.incidentId.toString() } });
            });
    }

    assignToSomeoneElse() {
        AppRoot.modal({
            contentId: 'assignToModal',
            showFooter: false
        }).then(result => {
            var value = result.pressedButton.value;
            var accountId = parseInt(value, 10);
            var member = <ApplicationMember>this.team.find((x, index) => x.id === accountId);
            AppRoot.Instance.incidentService
                .assign(this.incidentId, accountId, member.name)
                .then(x => AppRoot.notify('Incident have been assigned', 'fa-check'));
        });
    }


    mounted() {

    }

    close() {
        AppRoot.Instance.incidentService.showClose(this.incidentId, "CloseDialog")
            .then(result => {
                this.isClosed = true;
                if (result.requiresStatusUpdate) {
                    this.$router.push({
                        name: 'notifyUsers',
                        params: { incidentId: this.incident.Id.toString() }
                    });
                    return;
                }
            });
    }

    deleteIncident() {
        AppRoot.Instance.incidentService.delete(this.incidentId, "yes");
        AppRoot.notify("Incident have been removed", 'fa-info', 'success');
        this.$router.push({ name: 'suggest'});
    }

    private displayChart(days: ReportDay[]) {
        var labels: Date[] = [];
        var series: number[] = [];
        for (var i = 0; i < days.length; i++) {
            var value = new Date(days[i].Date);
            labels.push(value);
            series.push(days[i].Count);
        }

        var options = {
            axisY: {
                onlyInteger: true,
                offset: 0
            },
            axisX: {
                labelInterpolationFnc(value: any, index: number, labels: any) {
                    if (index % 3 !== 0) {
                        return '';
                    }
                    return moment(value).format('MMM D');
                }
            }
        };
        var data = {
            labels: labels,
            series: [{ data: series }],
        };
        new Chartist.Line('.ct-chart', data, options);
    }

}
