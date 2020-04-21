﻿using System;
using System.Diagnostics;
using Coderr.Client;
using Coderr.Server.Abstractions.Boot;
using Coderr.Server.Web.Boot.Adapters;
using Griffin.ApplicationServices;
using Griffin.Data;

namespace Coderr.Server.Web.Boot.Modules
{
    public class BackgroundJobs : IAppModule
    {
        private BackgroundJobManager _backgroundJobManager;
        private IConfiguration _configuration;


        public void Start(StartContext context)
        {
            var adapter = new DependencyInjectionAdapter(context.ServiceProvider);

            _backgroundJobManager = new BackgroundJobManager(adapter);
            _backgroundJobManager.ExecuteSequentially = true;
            _backgroundJobManager.JobFailed += OnBackgroundJobFailed;
            _backgroundJobManager.StartInterval = TimeSpan.FromSeconds(Debugger.IsAttached ? 0 : 10);
            _backgroundJobManager.ExecuteInterval = TimeSpan.FromSeconds(Debugger.IsAttached ? 0 : 30);
            _backgroundJobManager.ScopeClosing += OnBackgroundJobScopeClosing;
            _backgroundJobManager.Start();
        }

        public void Stop()
        {
            _backgroundJobManager?.Stop();
        }

        public void Configure(ConfigurationContext context)
        {
            _configuration = context.Configuration;
        }

        private void OnBackgroundJobFailed(object sender, BackgroundJobFailedEventArgs e)
        {
            Err.Report(e.Exception, new
            {
                JobType = e.Job.GetType().FullName
            });
        }

        private void OnBackgroundJobScopeClosing(object sender, ScopeClosingEventArgs e)
        {
            if (e.Successful)
                e.Scope.Resolve<IAdoNetUnitOfWork>().SaveChanges();
        }
    }
}